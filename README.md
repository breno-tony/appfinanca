# Meu Financeiro — MVP

App pessoal para controle de entradas, saídas, vendas e comissão.

## Configuração já aplicada
- Salário bruto: R$ 2.000,00
- Adiantamento: 40% no dia 20
- INSS estimado: 8% (editável)
- Restante do salário: projetado para o 5º dia útil
- Comissão:
  - até R$ 199.999,99 em vendas: 0,5%
  - de R$ 200.000,00 a R$ 299.999,99: 1%
  - a partir de R$ 300.000,00: 1,5%
  - +0,5 ponto percentual a cada R$ 100 mil adicionais
- Comissão prevista no dia 10 do mês seguinte à venda.

## Como usar
1. Abra `index.html` no navegador.
2. Vá em **Configurações** e ajuste saldo inicial/orçamento se desejar.
3. Registre todas as entradas e saídas em **Movimentações**.
4. Registre as vendas em **Vendas & comissão**.
5. O painel calcula automaticamente o total vendido, a faixa e a comissão.
6. Quando salário/comissão cair, use **Marcar recebido** no painel para transformar a previsão em entrada real.
7. Faça backup periodicamente em **Configurações > Exportar backup**.

## Dados
O app usa `localStorage`, portanto os dados ficam no navegador/dispositivo. Não há servidor, banco de dados ou conta online.

## Usar como app instalado (opcional)
Para recursos de PWA/instalação, rode a pasta em um servidor local.

Exemplo com Python:
`python -m http.server 8080`

Depois acesse:
`http://localhost:8080`

## Observação
O cálculo do 5º dia útil considera segunda a sexta-feira e não desconta feriados. O INSS é uma estimativa editável e não substitui folha de pagamento oficial.
