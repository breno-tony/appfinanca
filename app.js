(() => {
  "use strict";

  const STORAGE_KEY = "meuFinanceiro.v1";
  const MONTHS_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const SHORT_MONTHS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

  const defaultData = {
    version: 1,
    settings: {
      salaryGross: 2000,
      advancePercent: 40,
      inssPercent: 8,
      initialBalance: 0,
      commissionTier1: 0.5,
      commissionTier2: 1.0,
      commissionTier3: 1.5,
      commissionStep: 0.5,
      commissionDay: 10,
      monthlyBudget: 2500
    },
    categories: [
      {id:"cat-moradia", name:"Moradia", type:"expense"},
      {id:"cat-alimentacao", name:"Alimentação", type:"expense"},
      {id:"cat-transporte", name:"Transporte", type:"expense"},
      {id:"cat-lazer", name:"Lazer", type:"expense"},
      {id:"cat-saude", name:"Saúde", type:"expense"},
      {id:"cat-compras", name:"Compras", type:"expense"},
      {id:"cat-contas", name:"Contas", type:"expense"},
      {id:"cat-investimentos", name:"Investimentos", type:"expense"},
      {id:"cat-salario", name:"Salário", type:"income"},
      {id:"cat-comissao", name:"Comissão", type:"income"},
      {id:"cat-vendas", name:"Outras entradas", type:"income"}
    ],
    transactions: [],
    sales: []
  };

  let data = loadData();
  let currentView = "dashboard";
  let chartRaf = null;

  const $ = (id) => document.getElementById(id);
  const qsa = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

  function loadData(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return structuredClone(defaultData);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(defaultData),
        ...parsed,
        settings: {...defaultData.settings, ...(parsed.settings||{})},
        categories: Array.isArray(parsed.categories) ? parsed.categories : structuredClone(defaultData.categories),
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : []
      };
    }catch(e){
      console.error(e);
      return structuredClone(defaultData);
    }
  }

  function saveData(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid(prefix="id"){
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  function money(v){
    return Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  }

  function percent(v){
    return `${Number(v || 0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:2})}%`;
  }

  function parseNumber(value){
    if(typeof value === "number") return value;
    let s = String(value ?? "").trim().replace(/\s/g,"").replace(/R\$/gi,"");
    if(!s) return 0;
    if(s.includes(",") && s.includes(".")) s = s.replace(/\./g,"").replace(",",".");
    else if(s.includes(",")) s = s.replace(",",".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatInputNumber(v){
    return Number(v || 0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function isoDate(d=new Date()){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function parseISO(s){
    if(!s) return new Date();
    const [y,m,d] = s.split("-").map(Number);
    return new Date(y,m-1,d,12,0,0);
  }

  function formatDate(s){
    return parseISO(s).toLocaleDateString("pt-BR");
  }

  function formatMonthKey(key){
    const [y,m] = key.split("-").map(Number);
    return `${MONTHS_PT[m-1]} de ${y}`;
  }

  function monthKey(dateLike=new Date()){
    const d = dateLike instanceof Date ? dateLike : parseISO(dateLike);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function addMonths(base, amount){
    const d = new Date(base.getFullYear(), base.getMonth()+amount, 1, 12);
    return d;
  }

  function commissionRate(total){
    const s = data.settings;
    if(total < 200000) return s.commissionTier1;
    if(total < 300000) return s.commissionTier2;
    const extraSteps = Math.floor((total - 300000) / 100000);
    return s.commissionTier3 + extraSteps * s.commissionStep;
  }

  function commissionForMonth(key){
    const total = data.sales
      .filter(s => monthKey(s.date) === key && s.status !== "cancelled")
      .reduce((sum,s)=>sum+Number(s.amount||0),0);
    const rate = commissionRate(total);
    return {total, rate, commission: total * rate / 100};
  }

  function fifthBusinessDay(year, monthIndex){
    let count=0;
    for(let day=1; day<=15; day++){
      const d = new Date(year, monthIndex, day, 12);
      const wd = d.getDay();
      if(wd !== 0 && wd !== 6){
        count++;
        if(count === 5) return d;
      }
    }
    return new Date(year, monthIndex, 7, 12);
  }

  function salaryNetRemainder(){
    const s = data.settings;
    const advance = s.salaryGross * s.advancePercent/100;
    const inss = s.salaryGross * s.inssPercent/100;
    return Math.max(0, s.salaryGross - advance - inss);
  }

  function advanceValue(){
    const s = data.settings;
    return s.salaryGross * s.advancePercent/100;
  }

  function getCurrentMonthTransactions(){
    const key = monthKey(new Date());
    return data.transactions.filter(t=>monthKey(t.date)===key);
  }

  function totalsForTransactions(list){
    let income=0, expense=0;
    list.forEach(t => t.type === "income" ? income += Number(t.amount||0) : expense += Number(t.amount||0));
    return {income,expense,result:income-expense};
  }

  function currentBalance(){
    const t = totalsForTransactions(data.transactions);
    return Number(data.settings.initialBalance||0) + t.result;
  }

  function getCategoryName(id){
    return data.categories.find(c=>c.id===id)?.name || "Sem categoria";
  }

  function showToast(msg){
    const toast = $("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>toast.classList.remove("show"),2200);
  }

  function openModal(id){
    const el=$(id);
    el.classList.add("open");
    el.setAttribute("aria-hidden","false");
  }

  function closeModal(id){
    const el=$(id);
    el.classList.remove("open");
    el.setAttribute("aria-hidden","true");
  }

  function navigate(view){
    currentView = view;
    qsa(".view").forEach(v=>v.classList.remove("active"));
    $(`view-${view}`)?.classList.add("active");
    qsa("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===view));
    const labels = {
      dashboard:["PAINEL FINANCEIRO","Visão geral"],
      transactions:["CONTROLE DE CAIXA","Movimentações"],
      sales:["RENDA VARIÁVEL","Vendas & comissão"],
      planning:["PREVISIBILIDADE","Planejamento"],
      categories:["ORGANIZAÇÃO","Categorias"],
      settings:["PREFERÊNCIAS","Configurações"]
    };
    $("pageEyebrow").textContent = labels[view][0];
    $("pageTitle").textContent = labels[view][1];
    if(view==="dashboard") requestChart();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function populateMonthFilters(){
    const now = new Date();
    const keys = new Set();
    for(let i=-12;i<=3;i++) keys.add(monthKey(addMonths(now,i)));
    data.transactions.forEach(t=>keys.add(monthKey(t.date)));
    data.sales.forEach(s=>keys.add(monthKey(s.date)));
    const sorted=[...keys].sort().reverse();
    ["transactionMonthFilter","salesMonthFilter"].forEach(id=>{
      const sel=$(id);
      const current=sel.value;
      sel.innerHTML=sorted.map(k=>`<option value="${k}">${capitalize(formatMonthKey(k))}</option>`).join("");
      sel.value = sorted.includes(current)?current:monthKey(now);
    });
  }

  function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}

  function renderAll(){
    populateMonthFilters();
    renderDashboard();
    renderTransactions();
    renderSales();
    renderPlanning();
    renderCategories();
    renderSettings();
  }

  function renderDashboard(){
    const monthly = totalsForTransactions(getCurrentMonthTransactions());
    const balance=currentBalance();
    const cm = commissionForMonth(monthKey(new Date()));
    $("balanceValue").textContent=money(balance);
    $("monthIncomeSmall").textContent=`Entradas: ${money(monthly.income)}`;
    $("monthExpenseSmall").textContent=`Saídas: ${money(monthly.expense)}`;
    $("monthResultValue").textContent=money(monthly.result);
    $("monthResultValue").className=`money lg ${monthly.result<0?"amount-expense":""}`;
    $("commissionForecastValue").textContent=money(cm.commission);
    $("commissionForecastSubtitle").textContent=`Recebimento previsto: dia ${data.settings.commissionDay} do próximo mês`;
    $("salesMonthValue").textContent=money(cm.total);
    $("commissionRateText").textContent=`Faixa atual: ${percent(cm.rate)}`;
    renderReceivables();
    renderCategorySummary();
    renderRecentTransactions();
    requestChart();
  }

  function futureReceivables(limit=5){
    const now=new Date();
    const items=[];
    for(let offset=-1;offset<=3;offset++){
      const ref=addMonths(now,offset);
      const y=ref.getFullYear(), m=ref.getMonth();
      const advanceDate=new Date(y,m,20,12);
      if(advanceDate >= startOfDay(now)){
        items.push({type:"advance", date:advanceDate, label:"Adiantamento salarial", amount:advanceValue(), sourceMonth:monthKey(ref)});
      }
      const salaryDate=fifthBusinessDay(y,m);
      if(salaryDate >= startOfDay(now)){
        items.push({type:"salary", date:salaryDate, label:"Saldo do salário", amount:salaryNetRemainder(), sourceMonth:monthKey(addMonths(ref,-1))});
      }
      const commissionRef=addMonths(ref,-1);
      const commissionInfo=commissionForMonth(monthKey(commissionRef));
      const commissionDate=new Date(y,m,Math.min(28,Math.max(1,Number(data.settings.commissionDay||10))),12);
      if(commissionDate >= startOfDay(now) && commissionInfo.commission>0){
        items.push({
          type:"commission", date:commissionDate, label:`Comissão de ${MONTHS_PT[commissionRef.getMonth()]}`,
          amount:commissionInfo.commission, sourceMonth:monthKey(commissionRef)
        });
      }
    }
    items.sort((a,b)=>a.date-b.date);
    return items.slice(0,limit);
  }

  function startOfDay(d){
    return new Date(d.getFullYear(),d.getMonth(),d.getDate());
  }

  function receivableTransactionKey(item){
    return `auto:${item.type}:${isoDate(item.date)}:${item.sourceMonth}`;
  }

  function isReceivableRegistered(item){
    return data.transactions.some(t=>t.autoKey===receivableTransactionKey(item));
  }

  function renderReceivables(){
    const list=$("receivablesList");
    const items=futureReceivables(5);
    if(!items.length){list.innerHTML=`<div class="empty-state">Nenhum recebimento previsto.</div>`;return}
    list.innerHTML=items.map((it,i)=>{
      const received=isReceivableRegistered(it);
      return `<div class="receivable-item">
        <div class="receivable-meta">
          <strong>${escapeHtml(it.label)}</strong>
          <span>${it.date.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).replace(".","")}</span>
        </div>
        <div class="receivable-value">
          <strong>${money(it.amount)}</strong>
          ${received?`<small>Já registrado</small>`:`<button class="mini-action" data-receive-index="${i}">Marcar recebido</button>`}
        </div>
      </div>`;
    }).join("");
    qsa("[data-receive-index]",list).forEach(btn=>btn.addEventListener("click",()=>{
      const item=items[Number(btn.dataset.receiveIndex)];
      registerReceivable(item);
    }));
  }

  function registerReceivable(item){
    const cat = item.type==="commission" ? categoryIdByName("Comissão") : categoryIdByName("Salário");
    data.transactions.push({
      id:uid("trx"), type:"income", amount:item.amount, date:isoDate(item.date),
      category:cat, description:item.label, note:"Gerado a partir do calendário financeiro.",
      autoKey:receivableTransactionKey(item), createdAt:new Date().toISOString()
    });
    saveData(); renderAll(); showToast("Recebimento registrado no caixa.");
  }

  function categoryIdByName(name){
    return data.categories.find(c=>c.name===name)?.id || data.categories.find(c=>c.type!=="expense")?.id || "";
  }

  function renderCategorySummary(){
    const monthTx=getCurrentMonthTransactions().filter(t=>t.type==="expense");
    const sums={};
    monthTx.forEach(t=>sums[t.category]=(sums[t.category]||0)+Number(t.amount||0));
    const rows=Object.entries(sums).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const max=rows[0]?.[1]||1;
    const el=$("categorySummary");
    if(!rows.length){el.innerHTML=`<div class="empty-state">Sem saídas registradas neste mês.</div>`;return}
    el.innerHTML=rows.map(([cat,val])=>`<div>
      <div class="category-row-top"><span>${escapeHtml(getCategoryName(cat))}</span><span>${money(val)}</span></div>
      <div class="category-track"><div class="category-fill" style="width:${Math.max(4,val/max*100)}%"></div></div>
    </div>`).join("");
  }

  function renderRecentTransactions(){
    const rows=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date) || (b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,6);
    const el=$("recentTransactions");
    if(!rows.length){el.innerHTML=`<div class="empty-state">Nada registrado ainda.</div>`;return}
    el.innerHTML=rows.map(t=>`<div class="compact-item">
      <div><strong>${escapeHtml(t.description)}</strong><span>${formatDate(t.date)} · ${escapeHtml(getCategoryName(t.category))}</span></div>
      <strong class="${t.type==="income"?"amount-income":"amount-expense"}">${t.type==="income"?"+":"−"} ${money(t.amount)}</strong>
    </div>`).join("");
  }

  function renderTransactions(){
    renderTransactionCategoryOptions();
    const key=$("transactionMonthFilter").value || monthKey(new Date());
    const type=$("transactionTypeFilter").value || "all";
    const search=($("transactionSearch").value||"").trim().toLowerCase();
    const rows=data.transactions.filter(t=>{
      if(monthKey(t.date)!==key) return false;
      if(type!=="all" && t.type!==type) return false;
      if(search){
        const text=`${t.description} ${getCategoryName(t.category)} ${t.note||""}`.toLowerCase();
        if(!text.includes(search)) return false;
      }
      return true;
    }).sort((a,b)=>b.date.localeCompare(a.date) || (b.createdAt||"").localeCompare(a.createdAt||""));
    const totals=totalsForTransactions(rows);
    $("filteredIncome").textContent=money(totals.income);
    $("filteredExpense").textContent=money(totals.expense);
    $("filteredResult").textContent=money(totals.result);
    $("filteredResult").className=totals.result<0?"amount-expense":"";
    $("transactionsEmpty").style.display=rows.length?"none":"block";
    $("transactionsTableBody").innerHTML=rows.map(t=>`<tr>
      <td>${formatDate(t.date)}</td>
      <td><strong>${escapeHtml(t.description)}</strong>${t.note?`<div class="muted">${escapeHtml(t.note)}</div>`:""}</td>
      <td>${escapeHtml(getCategoryName(t.category))}</td>
      <td><span class="badge ${t.type}">${t.type==="income"?"Entrada":"Saída"}</span></td>
      <td class="${t.type==="income"?"amount-income":"amount-expense"}">${t.type==="income"?"+":"−"} ${money(t.amount)}</td>
      <td><div class="actions"><button class="row-btn" data-edit-trx="${t.id}">Editar</button><button class="row-btn" data-del-trx="${t.id}">Excluir</button></div></td>
    </tr>`).join("");
    qsa("[data-edit-trx]").forEach(b=>b.onclick=()=>editTransaction(b.dataset.editTrx));
    qsa("[data-del-trx]").forEach(b=>b.onclick=()=>deleteTransaction(b.dataset.delTrx));
  }

  function renderTransactionCategoryOptions(){
    const selected=$("transactionCategory").value;
    $("transactionCategory").innerHTML=data.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    if(data.categories.some(c=>c.id===selected)) $("transactionCategory").value=selected;
  }

  function newTransaction(){
    $("transactionForm").reset();
    $("transactionId").value="";
    $("transactionDate").value=isoDate();
    $("transactionModalTitle").textContent="Nova movimentação";
    renderTransactionCategoryOptions();
    openModal("transactionModal");
    setTimeout(()=>$("transactionAmount").focus(),50);
  }

  function editTransaction(id){
    const t=data.transactions.find(x=>x.id===id); if(!t)return;
    $("transactionId").value=t.id;
    qsa('input[name="transactionType"]').forEach(r=>r.checked=r.value===t.type);
    $("transactionAmount").value=formatInputNumber(t.amount);
    $("transactionDate").value=t.date;
    renderTransactionCategoryOptions();
    $("transactionCategory").value=t.category;
    $("transactionDescription").value=t.description;
    $("transactionNote").value=t.note||"";
    $("transactionModalTitle").textContent="Editar movimentação";
    openModal("transactionModal");
  }

  function deleteTransaction(id){
    if(!confirm("Excluir esta movimentação?")) return;
    data.transactions=data.transactions.filter(t=>t.id!==id);
    saveData(); renderAll(); showToast("Movimentação excluída.");
  }

  function renderSales(){
    const key=$("salesMonthFilter").value || monthKey(new Date());
    const filter=$("salesStatusFilter").value || "all";
    const info=commissionForMonth(key);
    $("salesCompetencyTotal").textContent=money(info.total);
    $("salesCompetencyRate").textContent=percent(info.rate);
    $("salesCompetencyCommission").textContent=money(info.commission);
    const [y,m]=key.split("-").map(Number);
    const payDate=new Date(y,m,Number(data.settings.commissionDay||10),12);
    $("salesCompetencyPayday").textContent=payDate.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).replace(".","");
    $("commissionRuleDescription").textContent=
      `até R$ 199.999,99 = ${percent(data.settings.commissionTier1)}; de R$ 200 mil a R$ 299.999,99 = ${percent(data.settings.commissionTier2)}; a partir de R$ 300 mil = ${percent(data.settings.commissionTier3)}, aumentando ${percent(data.settings.commissionStep)} a cada R$ 100 mil.`;
    const rows=data.sales.filter(s=>monthKey(s.date)===key && (filter==="all" || s.status===filter))
      .sort((a,b)=>b.date.localeCompare(a.date));
    $("salesEmpty").style.display=rows.length?"none":"block";
    $("salesTableBody").innerHTML=rows.map(s=>`<tr>
      <td>${formatDate(s.date)}</td>
      <td><strong>${escapeHtml(s.client)}</strong>${s.note?`<div class="muted">${escapeHtml(s.note)}</div>`:""}</td>
      <td>${money(s.amount)}</td>
      <td><span class="badge ${s.status}">${s.status==="cancelled"?"Cancelada":"Ativa"}</span></td>
      <td>${capitalize(formatMonthKey(monthKey(s.date)))}</td>
      <td><div class="actions"><button class="row-btn" data-edit-sale="${s.id}">Editar</button><button class="row-btn" data-del-sale="${s.id}">Excluir</button></div></td>
    </tr>`).join("");
    qsa("[data-edit-sale]").forEach(b=>b.onclick=()=>editSale(b.dataset.editSale));
    qsa("[data-del-sale]").forEach(b=>b.onclick=()=>deleteSale(b.dataset.delSale));
  }

  function newSale(){
    $("saleForm").reset();
    $("saleId").value="";
    $("saleDate").value=isoDate();
    $("saleStatus").value="valid";
    $("saleModalTitle").textContent="Registrar venda";
    openModal("saleModal");
    setTimeout(()=>$("saleAmount").focus(),50);
  }

  function editSale(id){
    const s=data.sales.find(x=>x.id===id); if(!s)return;
    $("saleId").value=s.id;
    $("saleAmount").value=formatInputNumber(s.amount);
    $("saleDate").value=s.date;
    $("saleStatus").value=s.status;
    $("saleClient").value=s.client;
    $("saleNote").value=s.note||"";
    $("saleModalTitle").textContent="Editar venda";
    openModal("saleModal");
  }

  function deleteSale(id){
    if(!confirm("Excluir esta venda?")) return;
    data.sales=data.sales.filter(s=>s.id!==id);
    saveData(); renderAll(); showToast("Venda excluída.");
  }

  function renderPlanning(){
    const monthly=totalsForTransactions(getCurrentMonthTransactions());
    const budget=Number(data.settings.monthlyBudget||0);
    const used=monthly.expense;
    const pct=budget>0?Math.min(100,used/budget*100):0;
    $("budgetLimitValue").textContent=money(budget);
    $("budgetUsedText").textContent=`${money(used)} usados`;
    $("budgetRemainingText").textContent=`${money(Math.max(0,budget-used))} restantes`;
    $("budgetProgressBar").style.width=`${pct}%`;
    $("budgetProgressBar").style.background=pct>=100?"#dc2626":pct>=80?"#d97706":"#0f172a";

    const items=futureReceivables(10);
    $("planningTimeline").innerHTML=items.length?items.map(it=>`<div class="timeline-item">
      <div class="timeline-date">${it.date.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).replace(".","")}</div>
      <div class="timeline-line"><div class="timeline-dot"></div></div>
      <div class="timeline-content"><strong>${escapeHtml(it.label)} · ${money(it.amount)}</strong><span>${isReceivableRegistered(it)?"Registrado no caixa":"Previsto"}</span></div>
    </div>`).join(""):`<div class="empty-state">Sem previsões no período.</div>`;

    let projected=currentBalance();
    const grouped=[];
    for(let i=0;i<3;i++){
      const ref=addMonths(new Date(),i);
      const key=monthKey(ref);
      const recs=futureReceivables(20).filter(r=>monthKey(r.date)===key && !isReceivableRegistered(r));
      const sum=recs.reduce((a,b)=>a+b.amount,0);
      projected+=sum;
      grouped.push({ref,sum,projected});
    }
    $("projectionCards").innerHTML=grouped.map(g=>`<div class="projection-item">
      <span>${capitalize(MONTHS_PT[g.ref.getMonth()])} ${g.ref.getFullYear()}</span>
      <strong>${money(g.projected)}</strong>
      <small>+ ${money(g.sum)} em recebimentos previstos</small>
    </div>`).join("");
  }

  function renderCategories(){
    const grid=$("categoriesGrid");
    grid.innerHTML=data.categories.map(c=>{
      const count=data.transactions.filter(t=>t.category===c.id).length;
      const typeLabel=c.type==="expense"?"Saída":c.type==="income"?"Entrada":"Ambos";
      return `<article class="card category-card">
        <div class="category-left">
          <div class="cat-icon">${escapeHtml(c.name.slice(0,1).toUpperCase())}</div>
          <div><strong>${escapeHtml(c.name)}</strong><span>${typeLabel} · ${count} movimentaç${count===1?"ão":"ões"}</span></div>
        </div>
        <button class="row-btn" data-del-cat="${c.id}" ${count?"disabled":""}>Excluir</button>
      </article>`;
    }).join("");
    qsa("[data-del-cat]").forEach(b=>b.onclick=()=>{
      if(b.disabled) return showToast("Categoria em uso. Reclassifique as movimentações antes.");
      if(!confirm("Excluir esta categoria?"))return;
      data.categories=data.categories.filter(c=>c.id!==b.dataset.delCat);
      saveData(); renderAll(); showToast("Categoria excluída.");
    });
  }

  function renderSettings(){
    const s=data.settings;
    $("settingSalary").value=formatInputNumber(s.salaryGross);
    $("settingAdvancePercent").value=formatInputNumber(s.advancePercent);
    $("settingInssPercent").value=formatInputNumber(s.inssPercent);
    $("settingInitialBalance").value=formatInputNumber(s.initialBalance);
    $("settingCommissionTier1").value=formatInputNumber(s.commissionTier1);
    $("settingCommissionTier2").value=formatInputNumber(s.commissionTier2);
    $("settingCommissionTier3").value=formatInputNumber(s.commissionTier3);
    $("settingCommissionStep").value=formatInputNumber(s.commissionStep);
    $("settingMonthlyBudget").value=formatInputNumber(s.monthlyBudget);
    $("settingCommissionDay").value=s.commissionDay;
  }

  function saveSettings(){
    const s=data.settings;
    s.salaryGross=parseNumber($("settingSalary").value);
    s.advancePercent=parseNumber($("settingAdvancePercent").value);
    s.inssPercent=parseNumber($("settingInssPercent").value);
    s.initialBalance=parseNumber($("settingInitialBalance").value);
    s.commissionTier1=parseNumber($("settingCommissionTier1").value);
    s.commissionTier2=parseNumber($("settingCommissionTier2").value);
    s.commissionTier3=parseNumber($("settingCommissionTier3").value);
    s.commissionStep=parseNumber($("settingCommissionStep").value);
    s.monthlyBudget=parseNumber($("settingMonthlyBudget").value);
    s.commissionDay=Math.max(1,Math.min(28,Math.round(parseNumber($("settingCommissionDay").value)||10)));
    saveData(); renderAll(); showToast("Configurações salvas.");
  }

  function drawChart(){
    const canvas=$("cashFlowChart"), empty=$("chartEmpty");
    if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<10)return;
    const dpr=Math.max(1,window.devicePixelRatio||1);
    canvas.width=Math.round(rect.width*dpr);
    canvas.height=Math.round(rect.height*dpr);
    const ctx=canvas.getContext("2d");
    ctx.scale(dpr,dpr);
    const W=rect.width,H=rect.height;
    ctx.clearRect(0,0,W,H);

    const now=new Date();
    const rows=[];
    for(let i=5;i>=0;i--){
      const ref=addMonths(now,-i), key=monthKey(ref);
      const totals=totalsForTransactions(data.transactions.filter(t=>monthKey(t.date)===key));
      rows.push({label:SHORT_MONTHS[ref.getMonth()],...totals});
    }
    const max=Math.max(...rows.flatMap(r=>[r.income,r.expense]),0);
    empty.style.display=max===0?"grid":"none";
    if(max===0)return;

    const pad={l:38,r:12,t:14,b:30};
    const iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
    ctx.font="10px system-ui";
    ctx.fillStyle="#94a3b8";
    ctx.strokeStyle="#e2e8f0";
    ctx.lineWidth=1;

    for(let i=0;i<=4;i++){
      const y=pad.t+ih*(i/4);
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      const val=max*(1-i/4);
      ctx.fillText(compactCurrency(val),2,y+3);
    }
    const groupW=iw/rows.length, barW=Math.min(18,groupW*.28);
    rows.forEach((r,i)=>{
      const cx=pad.l+groupW*i+groupW/2;
      const h1=r.income/max*ih, h2=r.expense/max*ih;
      ctx.fillStyle="#0f9f6e";
      roundRect(ctx,cx-barW-2,pad.t+ih-h1,barW,h1,4);ctx.fill();
      ctx.fillStyle="#ef4444";
      roundRect(ctx,cx+2,pad.t+ih-h2,barW,h2,4);ctx.fill();
      ctx.fillStyle="#64748b";
      ctx.textAlign="center";ctx.fillText(r.label,cx,H-8);ctx.textAlign="left";
    });
  }

  function compactCurrency(v){
    if(v>=1000000)return `R$ ${(v/1000000).toFixed(1)}m`;
    if(v>=1000)return `R$ ${(v/1000).toFixed(v>=10000?0:1)}k`;
    return `R$ ${Math.round(v)}`;
  }

  function roundRect(ctx,x,y,w,h,r){
    if(h<0){y+=h;h=Math.abs(h)}
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }

  function requestChart(){
    cancelAnimationFrame(chartRaf);
    chartRaf=requestAnimationFrame(drawChart);
  }

  function exportBackup(){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`meu-financeiro-backup-${isoDate()}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast("Backup exportado.");
  }

  function importBackup(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const parsed=JSON.parse(reader.result);
        if(!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.sales)) throw new Error("Formato inválido");
        data={
          ...structuredClone(defaultData),
          ...parsed,
          settings:{...defaultData.settings,...(parsed.settings||{})},
          categories:Array.isArray(parsed.categories)?parsed.categories:structuredClone(defaultData.categories)
        };
        saveData(); renderAll(); showToast("Backup importado.");
      }catch(e){
        alert("Não foi possível importar este arquivo. Verifique se é um backup válido do app.");
      }finally{
        $("importBackupInput").value="";
      }
    };
    reader.readAsText(file);
  }

  function escapeHtml(s){
    return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  function bindEvents(){
    qsa("[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
    qsa("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
    qsa("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));

    $("quickAddBtn").onclick=newTransaction;
    $("bottomAddBtn").onclick=()=> currentView==="sales" ? newSale() : newTransaction();
    $("addTransactionBtn").onclick=newTransaction;
    $("addSaleBtn").onclick=newSale;
    $("addCategoryBtn").onclick=()=>{ $("categoryForm").reset(); openModal("categoryModal"); };
    $("editBudgetBtn").onclick=()=>{ $("budgetAmount").value=formatInputNumber(data.settings.monthlyBudget); openModal("budgetModal"); };

    $("quickBackupBtn").onclick=exportBackup;
    $("exportBackupBtn").onclick=exportBackup;
    $("importBackupInput").onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);

    $("transactionMonthFilter").onchange=renderTransactions;
    $("transactionTypeFilter").onchange=renderTransactions;
    $("transactionSearch").oninput=renderTransactions;
    $("salesMonthFilter").onchange=renderSales;
    $("salesStatusFilter").onchange=renderSales;

    $("transactionForm").onsubmit=e=>{
      e.preventDefault();
      const id=$("transactionId").value;
      const item={
        id:id||uid("trx"),
        type:qsa('input[name="transactionType"]').find(r=>r.checked)?.value||"expense",
        amount:parseNumber($("transactionAmount").value),
        date:$("transactionDate").value,
        category:$("transactionCategory").value,
        description:$("transactionDescription").value.trim(),
        note:$("transactionNote").value.trim(),
        createdAt:new Date().toISOString()
      };
      if(item.amount<=0)return alert("Informe um valor maior que zero.");
      if(id){
        const old=data.transactions.find(t=>t.id===id);
        if(old?.autoKey)item.autoKey=old.autoKey;
        data.transactions=data.transactions.map(t=>t.id===id?item:t);
      }else data.transactions.push(item);
      saveData(); closeModal("transactionModal"); renderAll(); showToast("Movimentação salva.");
    };

    $("saleForm").onsubmit=e=>{
      e.preventDefault();
      const id=$("saleId").value;
      const item={
        id:id||uid("sale"), amount:parseNumber($("saleAmount").value), date:$("saleDate").value,
        status:$("saleStatus").value, client:$("saleClient").value.trim(), note:$("saleNote").value.trim(),
        createdAt:new Date().toISOString()
      };
      if(item.amount<=0)return alert("Informe um valor maior que zero.");
      if(id)data.sales=data.sales.map(s=>s.id===id?item:s); else data.sales.push(item);
      saveData(); closeModal("saleModal"); renderAll(); showToast("Venda salva e comissão recalculada.");
    };

    $("categoryForm").onsubmit=e=>{
      e.preventDefault();
      const name=$("categoryName").value.trim();
      if(!name)return;
      if(data.categories.some(c=>c.name.toLowerCase()===name.toLowerCase()))return alert("Essa categoria já existe.");
      data.categories.push({id:uid("cat"),name,type:$("categoryType").value});
      saveData(); closeModal("categoryModal"); renderAll(); showToast("Categoria criada.");
    };

    $("budgetForm").onsubmit=e=>{
      e.preventDefault();
      data.settings.monthlyBudget=Math.max(0,parseNumber($("budgetAmount").value));
      saveData(); closeModal("budgetModal"); renderAll(); showToast("Orçamento atualizado.");
    };

    $("saveSettingsBtn").onclick=saveSettings;
    $("resetDataBtn").onclick=()=>{
      if(!confirm("Isso vai apagar todas as movimentações, vendas e configurações salvas neste navegador. Continuar?"))return;
      if(!confirm("Última confirmação: deseja realmente apagar tudo?"))return;
      data=structuredClone(defaultData); saveData(); renderAll(); navigate("dashboard"); showToast("Dados apagados.");
    };
    window.addEventListener("resize",requestChart);
    window.addEventListener("keydown",e=>{
      if(e.key==="Escape")qsa(".modal.open").forEach(m=>closeModal(m.id));
    });
  }

  bindEvents();
  renderAll();
  navigate("dashboard");

  if("serviceWorker" in navigator && location.protocol.startsWith("http")){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
})();