# Geografia da resistência — Cloudflare Pages

Publicar `cloudflare/site`. O mapa usa JavaScript local; OSM funciona sem chave. Para CARTO: adicione `CARTO_BASEMAPS_KEY` como secret em Settings > Variables and Secrets, no projeto Pages, e reimplante. `_worker.js` faz a requisição Voyager sem divulgar a chave, e os tiles que falham retornam ao OSM no navegador. O endpoint de tiles é público; verificar termos e quota da conta CARTO. O mapa indica falha do fundo e mantém os marcadores.

CPV: coordenadas publicadas pelo Memorial da Resistência, inventário 072-06.001: https://memorialdaresistenciasp.org.br/lugares/centro-de-pastoral-vergueiro-cpv/. Avante: endereço na entrevista, confirmado como referência pela Arquidiocese; coordenada aproximada do logradouro, não do imóvel: https://cepbrasil.org/sao-paulo/sao-paulo/ipiranga/04201000. ATRI: sede ainda não confirmada. Não publicar dados inéditos do ZIP.

Após o deploy, abra Geografia; verifique três cores, CPV e Avante, zoom, alternância de abas e falha de tiles. Confira as seis colunas jurídicas e os vínculos integrados com paginação de 15.

Sedes Nova Piratininga (Brás e Sé): endereços publicados na bibliografia e pontos aproximados de CEP, não coordenadas dos imóveis. Ver https://www.serie-estudos.ucdb.br/serie-estudos/article/download/324/222/956 e https://ebooks.marilia.unesp.br/index.php/lab_editorial/catalog/download/448/4622/9280?inline=1. As iniciativas permanecem vermelhas mesmo sob filtros jurídicos; a sede contemporânea IIEP não recebe essa categoria.
