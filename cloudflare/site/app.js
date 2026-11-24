/* Atlas da Resistência: navegador estático, sem transmissão de matrizes privadas */
'use strict';
const $ = id => document.getElementById(id);
const HTML = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = x => x == null || x === 'NA' ? '' : String(x).trim();
const first = (row, keys) => keys.map(k => text(row[k])).find(Boolean) || '';
const schema = {
  Persons:['PersonID',['Name'],'Pessoa'],
  Institutions:['InstitutionID',['Name_ORIG','Name_ENG'],'Instituição'],
  Movements:['MovementID',['Name_ORIG','Name_EN'],'Movimento'],
  Events:['EventID',['EventType'],'Evento'],
  Concepts:['ConceptID',['Label_PT','Label_ORIG','ConceptName_ORIG','Label_EN'],'Conceito'],
  Documents:['DocumentID',['Title_ORIG','DisplayTitle_ORIG','DisplayTitle_EN','Repository'],'Documento'],
  Locations:['PlaceID',['PlaceName_ORIG','PlaceName_EN','PlaceName'],'Local']
};
const relations = [
 ['PersonMovements','PersonID','MovementID','Role'],
 ['PersonInstitutions','PersonID','InstitutionID','Role'],
 ['EventPersons','PersonID','EventID','Role'],
 ['EventConcepts','EventID','ConceptID','RelationType'],
 ['DocumentPersons','DocumentID','PersonID','RelationshipType'],
 ['DocumentEvents','DocumentID','EventID','RelationshipType'],
 ['DocumentLocations','DocumentID','PlaceID','RelationshipType'],
 ['InstitutionRelations','SourceInstitutionID','TargetInstitutionID','RelationshipType'],
 ['MovementRelations','SourceMovementID','TargetMovementID','RelationshipType'],
 ['MovementInstitutionRelations','MovementID','InstitutionID','RelationshipType']
];
const color={Pessoa:'#9D2235',Movimento:'#e2c68e',Instituição:'#d5d5d5',Evento:'#93adbb',Conceito:'#baa9ca',Documento:'#e3dfda',Local:'#a2bba5'};
const hubs=['M001','I008','I108','I107','M018','I116','I119','I005'];
let db={}, nodeById=new Map(), edgeRows=[], visible=new Set(), selected='', net=null, leafletMap=null, manifest={};
let imageCache=new Map();
const rows=key=>Array.isArray(db[key])?db[key]:[];

function parseCSV(csv){
  const all=[];let row=[],val='',quoted=false;
  csv=csv.replace(/^\uFEFF/,'');
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(quoted){if(c==='"'&&csv[i+1]==='"'){val+='"';i++;}else if(c==='"')quoted=false;else val+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(val);val='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(val);if(row.some(x=>x.trim()))all.push(row);row=[];val='';}
    else val+=c;
  }
  if(val||row.length){row.push(val);if(row.some(x=>x.trim()))all.push(row);}
  if(!all.length)return [];
  const header=all.shift().map(x=>x.trim());
  return all.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]||''])));
}

async function portrait(n){
  const id=n.id;
  if(imageCache.has(id))return imageCache.get(id);
  const local=manifest[id];
  if(local){
    const url='./assets/people/'+encodeURIComponent(local);
    try{const response=await fetch(url,{method:'HEAD'});if(response.ok){imageCache.set(id,url);return url;}}catch(e){}
  }
  const fallback=text(n.raw.ImageURL);
  const result=/^https?:\/\//i.test(fallback)?fallback:'';
  imageCache.set(id,result);return result;
}

async function normalize(){
  nodeById=new Map();edgeRows=[];imageCache=new Map();
  for(const [table,[key,labels,kind]] of Object.entries(schema)){
    for(const raw of rows(table)){
      const id=text(raw[key]);if(!id)continue;
      nodeById.set(id,{id,label:first(raw,labels)||id,kind,raw,photo:''});
    }
  }
  for(const [table,fromKey,toKey,relationKey] of relations){
    for(const raw of rows(table)){
      const from=text(raw[fromKey]),to=text(raw[toKey]);
      if(!nodeById.has(from)||!nodeById.has(to)||from===to)continue;
      edgeRows.push({from,to,relation:text(raw[relationKey])||'related_to',evidence:first(raw,['EvidenceText_ORIG','EvidenceText_EN']),status:text(raw.ReviewStatus)||'documented'});
    }
  }
  await Promise.all([...nodeById.values()].filter(n=>n.kind==='Pessoa').map(async n=>{n.photo=await portrait(n);}));
  updateSelectors();updateCounts();resetGraph();updateLaw();updateMap();
}

function updateSelectors(){
  const focus=$('focus'),role=$('role'),old=focus.value;
  const sorted=[...nodeById.values()].sort((a,b)=>a.label.localeCompare(b.label,'pt'));
  focus.innerHTML='<option value="">Núcleos principais</option>'+sorted.map(n=>'<option value="'+HTML(n.id)+'">'+HTML(n.label)+' ('+HTML(n.id)+')</option>').join('');
  if(nodeById.has(old))focus.value=old;
  role.innerHTML='<option value="">Todos os vínculos</option>'+[...new Set(edgeRows.map(e=>e.relation))].sort().map(x=>'<option>'+HTML(x)+'</option>').join('');
}
function neighbors(id){
  const result=[];for(const e of edgeRows){if(e.from===id)result.push(e.to);else if(e.to===id)result.push(e.from);}
  return [...new Set(result)].sort();
}
function resetGraph(){
  visible=new Set(hubs.filter(x=>nodeById.has(x)));
  const focus=$('focus').value;
  if(focus&&nodeById.has(focus)){visible.add(focus);neighbors(focus).slice(0,24).forEach(x=>visible.add(x));}
  else{
    for(const n of nodeById.values()){
      if(n.kind==='Pessoa'&&neighbors(n.id).filter(x=>visible.has(x)).length>=2)visible.add(n.id);
    }
    if(visible.size<6){for(const n of nodeById.values()){if(n.kind==='Pessoa'&&neighbors(n.id).some(x=>visible.has(x)))visible.add(n.id);}}
  }
  selected='';$('detail').hidden=true;drawGraph();
}
function expand(id,cap=24){if(!nodeById.has(id))return;neighbors(id).filter(x=>!visible.has(x)).slice(0,cap).forEach(x=>visible.add(x));drawGraph();}
function graphNode(n){
  const label=hubs.includes(n.id)||n.id===selected?n.label:'';
  return {id:n.id,label,group:n.kind,shape:n.photo?'circularImage':n.kind==='Movimento'?'diamond':'dot',image:n.photo||undefined,size:n.kind==='Pessoa'?29:hubs.includes(n.id)?35:23,borderWidth:2,title:'<b>'+HTML(n.label)+'</b><br>'+HTML(n.id)+' · '+HTML(n.kind),color:{background:color[n.kind]||'#ddd',border:'#666',highlight:{border:'#9D2235'}}};
}
function drawGraph(){
  const el=$('network');if(!window.vis){el.textContent='Não foi possível carregar a biblioteca visual do grafo.';return;}
  const filter=$('role').value;
  const visibleEdges=edgeRows.filter(e=>visible.has(e.from)&&visible.has(e.to)&&(!filter||e.relation===filter));
  const groups=new Map();
  for(const e of visibleEdges){const key=[e.from,e.to].sort().join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
  const edges=[...groups.values()].map((g,i)=>({id:'edge'+i,from:g[0].from,to:g[0].to,title:g.map(e=>'<b>'+HTML(e.relation)+'</b>'+(e.status!=='documented'?' (em revisão)':'')+(e.evidence?'<br>'+HTML(e.evidence.slice(0,270)):'')).join('<hr>'),dashes:g.some(e=>e.status!=='documented'),color:{color:'#bbb',highlight:'#9D2235'}}));
  const nodes=[...visible].map(id=>nodeById.get(id)).filter(Boolean).map(graphNode);
  if(net){net.destroy();net=null;}
  net=new vis.Network(el,{nodes,edges},{layout:{randomSeed:42},interaction:{hover:true,navigationButtons:true},physics:{solver:'barnesHut',barnesHut:{gravitationalConstant:-4800,centralGravity:.09,springLength:180,springConstant:.018,damping:.46,avoidOverlap:.5},stabilization:{enabled:true,iterations:180}},nodes:{font:{face:'Roboto',size:13,color:'#444'}},edges:{smooth:{type:'continuous'},width:1.25}});
  net.on('click',p=>{if(p.nodes.length){selected=p.nodes[0];showDetail(selected);expand(selected,24);}});
  $('graphStatus').textContent=nodes.length+' nós · '+edges.length+' conexões visíveis · '+edgeRows.length+' relações disponíveis.';
}
function showDetail(id){
  const n=nodeById.get(id);if(!n)return;
  const d=$('detail'),desc=first(n.raw,['Biography_ORIG','Notes','AnalyticalNote','Biography_EN']);
  let html='<button id="closeDetail" aria-label="Fechar painel">×</button>';
  if(n.photo)html+='<img src="'+HTML(n.photo)+'" alt="Retrato de '+HTML(n.label)+'">';
  html+='<h3>'+HTML(n.label)+'</h3><p class="muted">'+HTML(n.kind)+' · '+HTML(n.id)+'</p>';
  if(desc)html+='<p>'+HTML(desc)+'</p>';
  const links=edgeRows.filter(e=>e.from===id||e.to===id);
  html+='<strong>'+links.length+' relações</strong><ul>'+links.slice(0,10).map(e=>'<li>'+HTML(e.relation)+' → '+HTML(nodeById.get(e.from===id?e.to:e.from)?.label)+'</li>').join('')+'</ul>';
  d.innerHTML=html;d.hidden=false;$('closeDetail').onclick=()=>d.hidden=true;
}
function updateCounts(){
  const keys=[['Persons','Pessoas'],['Institutions','Instituições'],['Movements','Movimentos'],['Events','Acontecimentos'],['Documents','Documentos'],['Concepts','Conceitos']];
  const html=keys.map(([k,l])=>'<div class="stat"><strong>'+rows(k).length+'</strong>'+l+'</div>').join('');
  if($('summary'))$('summary').innerHTML=html;$('dataCounts').innerHTML=html;updateDataTable();
}
function updateMap(){
  if(!window.L){$('mapStatus').textContent='Não foi possível carregar a biblioteca do mapa.';return;}
  if(!leafletMap){leafletMap=L.map('map',{scrollWheelZoom:false}).setView([-23.55,-46.63],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(leafletMap);}
  leafletMap.eachLayer(layer=>{if(layer instanceof L.CircleMarker)leafletMap.removeLayer(layer);});
  const selected=$('mapConcept').value;
  let events=rows('Events');if(selected&&selected!=='ALL'){
    const ids=new Set(rows('EventConcepts').filter(e=>e.ConceptID===selected).map(e=>e.EventID));events=events.filter(e=>ids.has(e.EventID));
  }
  const countByPlace=new Map();events.forEach(e=>{if(e.PlaceID)countByPlace.set(e.PlaceID,(countByPlace.get(e.PlaceID)||0)+1);});
  let total=0;
  for(const r of rows('Locations')){
    if(!text(r.Latitude)||!text(r.Longitude))continue;
    const lat=Number(text(r.Latitude).replace(',','.')),lon=Number(text(r.Longitude).replace(',','.'));
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    const n=countByPlace.get(r.PlaceID)||0;if(selected!=='ALL'&&n===0)continue;
    const label=first(r,['PlaceName_ORIG','PlaceName_EN'])||r.PlaceID;
    const color=n>0?'#9D2235':'#808080';
    const radius=$('heat').checked?Math.max(5,Math.sqrt(n)*10):8;
    const marker=L.circleMarker([lat,lon],{radius,color,weight:2,fillOpacity:$('heat').checked?.42:.8}).addTo(leafletMap).bindPopup(HTML(label)+'<br>Acontecimentos: '+n);
    marker.on('click',()=>{$('mapSide').innerHTML='<h3>'+HTML(label)+'</h3><p><b>Localidade:</b> '+HTML(r.Municipality||'')+' · '+HTML(r.State||'')+'</p><p><b>Tipo de local:</b> '+HTML(r.PlaceType||'')+'</p><p><b>Acontecimentos documentados:</b> '+n+'</p><p>'+HTML(first(r,['MDH_Summary','Notes','MDH_Summary_EN']))+'</p><p class="auxiliary">Coordenadas: '+lat+', '+lon+'</p>';});
    total++;
  }
  $('mapStatus').textContent=total?total+' localidades representadas.':'Não há pontos com coordenadas disponíveis nesse recorte. Carregue Locations.csv para visualizar o mapa completo.';
  setTimeout(()=>leafletMap.invalidateSize(),100);
}

function tableHtml(head,body){return '<table class="table"><thead><tr>'+head.map(x=>'<th>'+HTML(x)+'</th>').join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+row.map(x=>'<td>'+HTML(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function updateLaw(){
  const items=rows('Concepts'),select=$('concept'),old=select.value;
  select.innerHTML=items.map(r=>'<option value="'+HTML(r.ConceptID)+'">'+HTML(first(r,['Label_PT','Label_ORIG','ConceptName_ORIG','Label_EN'])||r.ConceptID)+'</option>').join('');
  if(items.some(r=>r.ConceptID===old))select.value=old;
  const c=items.find(r=>r.ConceptID===select.value);
  $('conceptDetail').innerHTML=c?'<p><b>Tipo:</b> '+HTML(c.ConceptType)+'</p><p><b>Natureza:</b> '+HTML(c.ConceptNature)+'</p><p><b>Estatuto legal histórico:</b> '+HTML(c.HistoricalLegalStatus)+'</p><p><b>Estatuto prático:</b> '+HTML(c.HistoricalPracticalStatus)+'</p><p><b>Referência histórica:</b> '+HTML(c.HistoricalAnchor)+'</p><p><b>Referência atual:</b> '+HTML(c.CurrentAnchor)+'</p><hr><p><b>Nota analítica:</b><br>'+HTML(c.AnalyticalNote)+'</p>':'Carregue Concepts.csv para consultar o compêndio.';
  const ids=new Set(rows('EventConcepts').filter(r=>r.ConceptID===select.value).map(r=>r.EventID));
  const ev=rows('Events').filter(e=>ids.has(e.EventID));
  const evPersons=new Map();for(const ep of rows('EventPersons')){if(!evPersons.has(ep.EventID))evPersons.set(ep.EventID,[]);evPersons.get(ep.EventID).push(nodeById.get(ep.PersonID)?.label||ep.PersonID);}
  $('conceptEvents').innerHTML=ev.length?tableHtml(['Pessoa(s)','Evento','Início','Fim'],ev.map(e=>[(evPersons.get(e.EventID)||[]).join(', ')||'Em mapeamento',e.EventType,e.StartDate,e.EndDate])):'Os vínculos dessa categoria ainda estão em mapeamento.';
  updateConceptChart();
}
function updateConceptChart(){
  const evIDs=new Set(rows('EventConcepts').filter(r=>r.ConceptID===$('concept').value).map(r=>r.EventID));
  const years=new Map();for(const e of rows('Events')){if(!evIDs.has(e.EventID))continue;const year=/\b(?:19|20)\d{2}\b/.exec(text(e.StartDate));if(!year)continue;years.set(year[0],(years.get(year[0])||0)+1);}
  const chart=$('conceptChart');if(!years.size){chart.textContent='Não há dados cronológicos disponíveis para essa categoria.';return;}
  const vals=[...years].sort((a,b)=>+a[0]-+b[0]),max=Math.max(...vals.map(x=>x[1])),w=Math.max(550,vals.length*35),h=350;
  let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Frequência de acontecimentos por ano" style="width:100%;max-height:410px">';
  svg+='<line x1="40" y1="300" x2="'+(w-20)+'" y2="300" stroke="#888"/>';
  vals.forEach(([year,value],i)=>{const x=50+i*((w-80)/vals.length),bh=240*value/max;svg+='<rect x="'+x+'" y="'+(300-bh)+'" width="'+Math.max(9,(w-100)/vals.length-5)+'" height="'+bh+'" fill="#9D2235"><title>'+year+': '+value+' acontecimentos</title></rect><text x="'+x+'" y="320" font-size="12" fill="#666">'+year+'</text>';});
  chart.innerHTML=svg+'</svg><p class="auxiliary">Ocorrências documentadas por ano — visualização construída a partir de Events.csv e EventConcepts.csv.</p>';
}


async function restore(){
  const response=await fetch('data/demo.json',{cache:'no-store'});if(!response.ok)throw Error('Dados de demonstração indisponíveis');
  db=await response.json();await normalize();updateAdditionalData();$('uploadStatus').textContent='Demonstração restaurada.';
}
async function importFiles(list){
  const updated={...db};let count=0;
  for(const f of list){const key=f.name.replace(/\.csv$/i,'').replace(/\s*\(\d+\)$/,'');if(!key)continue;updated[key]=parseCSV(await f.text());count++;}
  db=updated;await normalize();updateAdditionalData();$('uploadStatus').textContent=count+' tabela(s) carregada(s) localmente. Os arquivos não foram enviados ao servidor.';
}
async function cosmov(){
  const term=$('cosQuery').value.trim(),box=$('cosResults');if(!term)return;box.textContent='Consultando OpenAlex...';
  try{const response=await fetch('https://api.openalex.org/works?search='+encodeURIComponent(term)+'&per-page=15');if(!response.ok)throw Error('HTTP '+response.status);
    const result=await response.json(),works=result.results||[];box.innerHTML=works.length?tableHtml(['Ano','Título','Identificador'],works.map(w=>[w.publication_year,w.title,w.doi||w.id])):'Nenhuma publicação encontrada.';
  }catch(e){box.textContent='Falha na consulta pública: '+e.message;}
}
document.addEventListener('DOMContentLoaded',async()=>{
  document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x===b));
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.page));
    if(b.dataset.page==='mapa'&&leafletMap)setTimeout(()=>leafletMap.invalidateSize(),100);
    if(b.dataset.page==='grafo'&&net)setTimeout(()=>{net.redraw();net.fit({animation:false});},120);if(b.dataset.page==='juridico')updateConceptChart();
  }));
  $('focus').onchange=resetGraph;$('role').onchange=drawGraph;
  $('reset').onclick=()=>{$('focus').value='';resetGraph();};
  $('expand').onclick=()=>{if(selected)expand(selected,50);else hubs.forEach(h=>{if(nodeById.has(h))neighbors(h).slice(0,8).forEach(x=>visible.add(x));});drawGraph();};
  $('concept').onchange=()=>{updateLaw();updateConceptChart();};
  $('csvUpload').onchange=async e=>{try{await importFiles([...e.target.files]);}catch(err){$('uploadStatus').textContent='Erro: '+err.message;}};
  $('restore').onclick=()=>restore().catch(e=>$('uploadStatus').textContent=e.message);
  $('cosSearch').onclick=cosmov;setupAdditionalUI();
  try{manifest=await (await fetch('assets/people/manifest.json')).json();await restore();}
  catch(e){$('uploadStatus').textContent=e.message;$('network').textContent=e.message;}
});


// Componentes fiéis à estrutura original, sem servidor R permanente.
const localizations={Person:'Pessoa',Institution:'Instituição',Movement:'Movimento',Event:'Evento',Location:'Local',Concept:'Conceito',Document:'Documento'};
const subjectTypes={Person:'Pessoa',Document:'Documento',Institution:'Instituição',Movement:'Movimento',Event:'Evento',Location:'Local',Concept:'Conceito'};
const typeToKind={Person:'Pessoa',Document:'Documento',Institution:'Instituição',Movement:'Movimento',Event:'Evento',Location:'Local',Concept:'Conceito'};
const kindToType=Object.fromEntries(Object.entries(typeToKind).map(([k,v])=>[v,k]));
function setupAdditionalUI(){
  document.querySelectorAll('input[name="graphMode"]').forEach(x=>x.onchange=()=>{
    const mode=document.querySelector('input[name="graphMode"]:checked')?.value;
    const select=$('focus');
    const available=[...nodeById.values()].filter(n=>mode==='overview'?false:mode==='person'?n.kind==='Pessoa':n.kind==='Movimento'||n.kind==='Instituição').sort((a,b)=>a.label.localeCompare(b.label,'pt'));
    if(mode==='overview'){select.value='';}else{
      select.innerHTML=available.map(n=>'<option value="'+HTML(n.id)+'">'+HTML(n.label)+'</option>').join('');
    }
    resetGraph();
  });
  $('heat').onchange=updateMap;$('mapConcept').onchange=updateMap;
  $('legalEventsTab').onclick=()=>showLegalTab(false);$('legalTrendsTab').onclick=()=>showLegalTab(true);
  $('dataFilter').oninput=updateDataTable;
  $('exportSelected').onclick=exportDataTable;
  $('subject').onchange=refreshPredicates;$('predicate').onchange=refreshObjects;
  $('runQuery').onclick=executeQuery;
}
function showLegalTab(trends){
  $('legalTrendsTab').classList.toggle('active',trends);$('legalEventsTab').classList.toggle('active',!trends);
  $('conceptEvents').hidden=trends;$('conceptChart').hidden=!trends;
}
function updateAdditionalData(){
  const s=$('subject'),old=s.value;
  s.innerHTML='<option value="">Selecione...</option>'+Object.entries(subjectTypes).map(([x,label])=>'<option value="'+x+'">'+label+'</option>').join('');
  if(subjectTypes[old])s.value=old;
  refreshPredicates();refreshMapConcept();updateDataTable();updateConceptChart();
}
function refreshPredicates(){
  const kind=typeToKind[$('subject').value],eligible=new Set(edgeRows.filter(e=>nodeById.get(e.from)?.kind===kind).map(e=>e.relation));
  $('predicate').innerHTML='<option value="">Selecione o predicado...</option>'+[...eligible].sort().map(x=>'<option>'+HTML(x)+'</option>').join('');
  const icon={Person:'Pessoas',Institution:'Instituicoes',Movement:'Movimentos',Event:'Eventos',Concept:'Conceitos',Document:'Documentos',Location:'Locais'};
  $('iconSubject').src='icons/'+(icon[$('subject').value]||'Pessoas')+'.png';
  refreshObjects();
}
function refreshObjects(){
  const kind=typeToKind[$('subject').value],pred=$('predicate').value;
  const eligible=new Set(edgeRows.filter(e=>nodeById.get(e.from)?.kind===kind&&e.relation===pred).map(e=>nodeById.get(e.to)?.kind));
  $('object').innerHTML='<option value="">Selecione o objeto...</option>'+[...eligible].filter(Boolean).map(k=>'<option value="'+(kindToType[k]||'')+'">'+HTML(k)+'</option>').join('');
  const icon={Pessoa:'Pessoas',Instituição:'Instituicoes',Movimento:'Movimentos',Evento:'Eventos',Conceito:'Conceitos',Documento:'Documentos',Local:'Locais'};
  const k=typeToKind[$('object').value];$('iconObject').src='icons/'+(icon[k]||'Movimentos')+'.png';
}
function executeQuery(){
  const btn=$('runQuery');btn.classList.add('is-loading');setTimeout(()=>btn.classList.remove('is-loading'),1700);
  const sparql=$('sparqlText').value.trim();let matching=[],limit=100;
  if(sparql){
    // Subconjunto documentado: uma única tripla SELECT com variáveis; sem FILTER, JOIN ou PREFIX.
    const m=/select\s+([\s\S]*?)\s+where\s*\{\s*([^{}]+?)\s*\}\s*(?:limit\s+(\d+))?\s*$/i.exec(sparql);
    if(!m||m[2].includes(';')||m[2].includes(',')||/\b(filter|optional|union|bind|service)\b/i.test(m[2])){
      $('sparqlResults').textContent='A versão local aceita somente SELECT com um padrão de tripla e LIMIT. Consultas SPARQL completas dependem do mecanismo RDF/Fuseki.';return;
    }
    const parts=m[2].trim().replace(/\s*\.\s*$/,'').split(/\s+/);if(parts.length!==3){$('sparqlResults').textContent='Use um padrão simples: SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10';return;}
    limit=Math.min(2000,Number(m[3])||100);matching=edgeRows.filter(e=>{
      const matches=(pat,val)=>pat.startsWith('?')||pat===val||pat.replace(/^ex:/,'')===val;
      return matches(parts[0],e.from)&&matches(parts[1],e.relation)&&matches(parts[2],e.to);
    });
  }else{
    const type=typeToKind[$('subject').value],pred=$('predicate').value,target=typeToKind[$('object').value];
    matching=edgeRows.filter(e=>(!type||nodeById.get(e.from)?.kind===type)&&(!pred||e.relation===pred)&&(!target||nodeById.get(e.to)?.kind===target));
  }
  const selected=matching.slice(0,limit);
  $('sparqlResults').innerHTML=selected.length?tableHtml(['Sujeito','Predicado','Objeto','Evidência'],selected.map(e=>[nodeById.get(e.from)?.label||e.from,e.relation,nodeById.get(e.to)?.label||e.to,e.evidence])):'Nenhuma relação encontrada.';
}
function refreshMapConcept(){
  const c=$('mapConcept'),old=c.value;
  c.innerHTML='<option value="ALL">Todas as categorias</option>'+rows('Concepts').map(r=>'<option value="'+HTML(r.ConceptID)+'">'+HTML(first(r,['Label_PT','Label_ORIG','Label_EN'])||r.ConceptID)+'</option>').join('');
  if(old&&[...c.options].some(x=>x.value===old))c.value=old;
}
function updateDataTable(){
  if(!$('dataTable'))return;
  const term=text($('dataFilter').value).toLocaleLowerCase('pt');
  let matches=edgeRows.filter(e=>{if(!term)return true;return [e.from,e.to,e.relation,e.evidence,nodeById.get(e.from)?.label,nodeById.get(e.to)?.label].some(x=>text(x).toLocaleLowerCase('pt').includes(term));});
  $('dataTable').dataset.matches=matches.length;
  $('dataTable').innerHTML='<p class="auxiliary">'+matches.length+' vínculos encontrados. Exibindo os primeiros 100 registros.</p>'+tableHtml(['Indivíduo/Origem','Relação','Instituição/Destino','Evidência'],matches.slice(0,100).map(e=>[nodeById.get(e.from)?.label||e.from,e.relation,nodeById.get(e.to)?.label||e.to,e.evidence]));
}
function exportDataTable(){
  const term=text($('dataFilter').value).toLocaleLowerCase('pt');
  const matches=edgeRows.filter(e=>!term||[e.from,e.to,e.relation,e.evidence,nodeById.get(e.from)?.label,nodeById.get(e.to)?.label].some(x=>text(x).toLocaleLowerCase('pt').includes(term)));
  const quote=x=>'"'+text(x).replace(/"/g,'""')+'"';
  const csv=[['Origem','Relacao','Destino','Evidencia'],...matches.map(e=>[nodeById.get(e.from)?.label||e.from,e.relation,nodeById.get(e.to)?.label||e.to,e.evidence])].map(row=>row.map(quote).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='atlas-relacoes-filtradas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
