# Tabelas novas do Atlas

Estes são **novos tipos de arestas**, sem substituir `PersonInstitutions` ou `PersonMovements`:

1. `InstitutionRelations.csv` — relações I→I.
2. `MovementRelations.csv` — relações M→M.
3. `MovementInstitutionRelations.csv` — relações M→I.

Todas possuem IDs, predicado, datas (vazias quando desconhecidas), precisão temporal, evidência original e inglês, documento-fonte, URL, confiança e situação da verificação. Os IDs foram conferidos com `Atlas_OSMSP_matriz_corrigida_2026-11-19.xlsx` e `Movements(1).csv`.

`ReviewStatus=documented` significa apenas que o predicado específico encontra respaldo; NÃO significa participação formal de qualquer pessoa ou identidade jurídica entre as organizações. As categorias `review_scope`, `review_period` e `researcher_reported` exigem revisão histórica antes de divulgação como certeza.

Os arquivos foram exportados com codificação UTF-8 com BOM para facilitar importação no Excel. URLs de fontes são metadados da matriz, não links para downloads automáticos de conteúdo.
