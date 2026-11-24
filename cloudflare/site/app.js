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
  Concepts:['ConceptID',['Label_ORIG','ConceptName_ORIG','Label_EN'],'Conceito'],
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
  updateSelectors();updateCounts();resetGraph();updateLaw();updateRelations();updateMap();
}

function updateSelectors(){
  const focus=$('focus'),role=$('role'),entity=$('entity'),old=focus.value;
  const sorted=[...nodeById.values()].sort((a,b)=>a.label.localeCompare(b.label,'pt'));
  focus.innerHTML='<option value="">Núcleos principais</option>'+sorted.map(n=>'<option value="'+HTML(n.id)+'">'+HTML(n.label)+' ('+HTML(n.id)+')</option>').join('');
  if(nodeById.has(old))focus.value=old;
  entity.innerHTML=sorted.map(n=>'<option value="'+HTML(n.id)+'">'+HTML(n.label)+'</option>').join('');
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
  $('summary').innerHTML=html;$('dataCounts').innerHTML=html;
}
function updateMap(){
  if(!window.L){$('mapStatus').textContent='Biblioteca do mapa indisponível.';return;}
  if(!leafletMap){leafletMap=L.map('map',{scrollWheelZoom:false}).setView([-23.55,-46.63],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(leafletMap);}
  leafletMap.eachLayer(layer=>{if(layer instanceof L.CircleMarker)leafletMap.removeLayer(layer);});
  let count=0;
  for(const raw of rows('Locations')){
    if(!text(raw.Latitude)||!text(raw.Longitude))continue;
    const lat=Number(text(raw.Latitude).replace(',','.')),lon=Number(text(raw.Longitude).replace(',','.'));
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    L.circleMarker([lat,lon],{radius:7,color:'#9D2235',fillOpacity:.7}).addTo(leafletMap).bindPopup(HTML(first(raw,['PlaceName_ORIG','PlaceName_EN','PlaceName'])||raw.PlaceID));count++;
  }
  $('mapStatus').textContent=count?count+' localidades representadas.':'Demonstração sem localizações: carregue Locations.csv para visualizar as coordenadas da matriz.';
  setTimeout(()=>leafletMap.invalidateSize(),100);
}
function tableHtml(head,body){return '<table class="table"><thead><tr>'+head.map(x=>'<th>'+HTML(x)+'</th>').join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+row.map(x=>'<td>'+HTML(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function updateLaw(){
  const items=rows('Concepts'),select=$('concept'),old=select.value;
  select.innerHTML=items.map(r=>'<option value="'+HTML(r.ConceptID)+'">'+HTML(first(r,['Label_ORIG','ConceptName_ORIG','Label_EN'])||r.ConceptID)+'</option>').join('');
  if(items.some(r=>r.ConceptID===old))select.value=old;
  const concept=items.find(r=>r.ConceptID===select.value);
  $('conceptDetail').innerHTML=concept?'<h3>'+HTML(first(concept,['Label_ORIG','ConceptName_ORIG','Label_EN']))+'</h3><p>'+HTML(first(concept,['AnalyticalNote','HistoricalAnchor','CurrentAnchor']))+'</p>':'Carregue Concepts.csv para consultar conceitos jurídicos.';
  const ids=new Set(rows('EventConcepts').filter(r=>r.ConceptID===select.value).map(r=>r.EventID));
  const events=rows('Events').filter(e=>ids.has(e.EventID));
  $('conceptEvents').innerHTML=events.length?tableHtml(['Evento','Tipo','Data'],events.map(e=>[e.EventID,e.EventType,e.StartDate])):'Sem eventos relacionados nesta demonstração.';
}
function updateRelations(){
  const id=$('entity').value,items=edgeRows.filter(e=>e.from===id||e.to===id);
  $('relations').innerHTML=items.length?tableHtml(['Entidade','Relação','Status'],items.map(e=>[nodeById.get(e.from===id?e.to:e.from)?.label,e.relation,e.status==='documented'?'Documentada':'A confirmar'])):'Nenhuma relação disponível.';
}
async function restore(){
  const response=await fetch('data/demo.json',{cache:'no-store'});if(!response.ok)throw Error('Dados de demonstração indisponíveis');
  db=await response.json();await normalize();$('uploadStatus').textContent='Demonstração restaurada.';
}
async function importFiles(list){
  const updated={...db};let count=0;
  for(const f of list){const key=f.name.replace(/\.csv$/i,'').replace(/\s*\(\d+\)$/,'');if(!key)continue;updated[key]=parseCSV(await f.text());count++;}
  db=updated;await normalize();$('uploadStatus').textContent=count+' tabela(s) carregada(s) localmente. Os arquivos não foram enviados ao servidor.';
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
    if(b.dataset.page==='grafo'&&net)setTimeout(()=>{net.redraw();net.fit({animation:false});},120);
  }));
  $('focus').onchange=resetGraph;$('role').onchange=drawGraph;
  $('reset').onclick=()=>{$('focus').value='';resetGraph();};
  $('expand').onclick=()=>{if(selected)expand(selected,50);else hubs.forEach(h=>{if(nodeById.has(h))neighbors(h).slice(0,8).forEach(x=>visible.add(x));});drawGraph();};
  $('concept').onchange=updateLaw;$('entity').onchange=updateRelations;
  $('upload').onchange=async e=>{try{await importFiles([...e.target.files]);}catch(err){$('uploadStatus').textContent='Erro: '+err.message;}};
  $('restore').onclick=()=>restore().catch(e=>$('uploadStatus').textContent=e.message);
  $('cosSearch').onclick=cosmov;
  try{manifest=await (await fetch('assets/people/manifest.json')).json();await restore();}
  catch(e){$('uploadStatus').textContent=e.message;$('network').textContent=e.message;}
});
