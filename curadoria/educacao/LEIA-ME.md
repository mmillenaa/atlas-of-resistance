# Inclusão de Maria Nilde Mascellani e normalização da docência
- P058 é uma nova pessoa; a mini-biografia e o URL de imagem estão no Atlas público.
- I129 (Ginásios Vocacionais) já existia, inclusive com vínculo P040 (Cecília Guaraná); foi incluído nos destaques educativos.
- I108 (Escola Nova Piratininga) liga Maria Nilde à rede educativa associada à OSM-SP por **articulação de financiamento**, não por filiação presumida.
- As 10 relações de `teacher`/`professor` em `PersonInstitutions` foram unificadas como `teaches_at` no grafo e na projeção JSON. `educator` (atuação educativa ampla) e `teacher_trainer` (formação de docentes) permanecem distintos.
- O gerador Python `app/gerar_ttl.py` agora transforma as variantes antigas `teacher`/`professor` em `teaches_at`; para atualizar o Fuseki é necessário regenerar e recarregar o Turtle a partir dos CSVs locais já atualizados.
- As matrizes completas em `app/data/*.csv` **não são versionadas** por conter conteúdo científico ainda não publicado. Não fazer commit dos CSVs integrais.
- Não se estabeleceu relação causal direta entre OSM-SP e a criação do PROEJA/PROEJA FIC.
Fontes:
https://www4.pucsp.br/cedic/memoria_educacao/root/apresentacao.html
https://serieucdb.emnuvens.com.br/serie-estudos/article/download/324/222/956
https://new.scielo.br/j/es/a/P8cQDsqzSnqqvmF9b89KZkq/?lang=pt
