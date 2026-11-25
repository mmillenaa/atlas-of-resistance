/*
 * Atlas da Resistência — exploração em D3.js, sem alterar as matrizes.
 * Visualização inspirada na navegação por pessoas do Linked Jazz.
 * Nós de pessoas têm prioridade; instituições e movimentos continuam
 * representados, mas só recebem rótulo quando o usuário lhes dá foco.
 */
(function(){
'use strict';
const d3=window.d3;
const positions=new Map();
let previous=null;
const palette={Pessoa:'#9D2235',Movimento:'#d1b078',Instituição:'#c5cbd1',Documento:'#e0e0e0',Evento:'#96b4c3',Conceito:'#c4b3da',Local:'#afc5b7'};
function degreeMap(edges){
 const m=new Map();const pairs=new Set();
 for(const e of edges){
  const a=typeof e.from==='object'?e.from.id:e.from;
  const b=typeof e.to==='object'?e.to.id:e.to;
  const k=[a,b].sort().join('|');if(pairs.has(k))continue;pairs.add(k);
  m.set(a,(m.get(a)||0)+1);m.set(b,(m.get(b)||0)+1);
 }
 return m;
}
function initials(label){const clean=String(label||'').replace(/\([^)]*\)/g,' ').replace(/\([^)]*$/g,' ').trim();const words=clean.match(/[\p{L}\p{N}]+/gu)||[];const meaningful=words.filter(w=>!['de','da','do','das','dos','e'].includes(w.toLowerCase()));return meaningful.slice(0,2).map(w=>Array.from(w)[0]).join('').toLocaleUpperCase('pt-BR');}
function radius(node,degree){
 const n=degree.get(node.id)||0;
 if(node.id==='M001')return 62;
 if(node.group==='Pessoa')return Math.max(33,Math.min(53,34+5.5*Math.log2(n+1)));
 if(node.group==='Movimento')return Math.max(18,Math.min(28,18+2*Math.log2(n+1)));
 if(node.group==='Instituição')return Math.max(14,Math.min(25,14+2*Math.log2(n+1)));
 return 13;
}
function labelLines(label){
 const words=String(label||'').trim().split(/\s+/);const result=[];let current='';
 for(const w of words){
  if(current && (current+' '+w).length>26){result.push(current);current=w;}else current+=(current?' ':'')+w;
 }
 if(current)result.push(current);
 if(result.length>2){result.splice(2);result[1]=result[1].slice(0,24)+'…';}
 return result;
}
function draw(nodeRows,edgeRows,onSelect){
 const parent=document.getElementById('network');
 if(!parent||!d3)return null;
 if(previous?.destroy)previous.destroy();
 parent.textContent='';
 const width=Math.max(900,parent.clientWidth||Math.min(1600,window.innerWidth-65));
 const height=Math.max(720,parent.clientHeight||760);
 const degrees=degreeMap(edgeRows);
 const orgMode=(document.getElementById('graphFilter')?.value||'all')!=='all';
 const ids=new Set(nodeRows.map(n=>n.id));
 const nodes=nodeRows.map((n,i)=>{
  const p=positions.get(n.id),a=i*2.399963229728653,dist=20+Math.sqrt(i)*31;
  return {...n,kind:n.group,fullLabel:n.fullLabel||n.label||'',r:radius(n,degrees),
   x:p?.x??width/2+dist*Math.cos(a),y:p?.y??height/2+dist*Math.sin(a),vx:0,vy:0};
 });
 // Desenhar pessoas e OSM por último impede que círculos de organizações
 // cubram rostos quando os nós ficam próximos.
 const frontWeight=n=>n.id==='M001'?3:n.kind==='Pessoa'?2:0;
 nodes.sort((a,b)=>frontWeight(a)-frontWeight(b));
 const links=edgeRows.filter(l=>ids.has(l.from)&&ids.has(l.to)).map(e=>({...e,source:e.from,target:e.to}));
 const svg=d3.select(parent).append('svg').attr('viewBox',`0 0 ${width} ${height}`)
  .attr('preserveAspectRatio','xMidYMid meet')
  .attr('role','img').attr('aria-label','Rede histórica: pessoas em destaque, organizações por seleção');
 const viewport=svg.append('g').attr('class','lj-viewport');
 const edgeLayer=viewport.append('g').attr('class','lj-links');
 const nodeLayer=viewport.append('g').attr('class','lj-nodes');
 const zoom=d3.zoom().scaleExtent([0.35,4.2]).on('zoom',event=>viewport.attr('transform',event.transform));
 svg.call(zoom).on('dblclick.zoom',null);
 const edge=edgeLayer.selectAll('line.lj-edge').data(links).enter().append('line')
  .attr('class','lj-edge')
  .attr('stroke-dasharray',l=>l.dashes||/proposta|revisão|pesquisadora|inferida/i.test(l.title||'')?'4 4':null);
 edge.append('title').text(l=>String(l.title||'').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' '));
 const defs=svg.append('defs');
 const groups=nodeLayer.selectAll('g.lj-node').data(nodes,n=>n.id).enter().append('g')
  .attr('class',n=>'lj-node'+(n.kind==='Pessoa'?' atlas-person':' atlas-organization'))
  .attr('tabindex',0).attr('role','button').attr('aria-label',n=>n.fullLabel||n.id);
 groups.each(function(n){
  const g=d3.select(this),osm=n.id==='M001';
  g.append('circle').attr('r',n.r).attr('class',osm?'member-highlight':'')
    .attr('fill',osm||n.osmLinked?'#9D2235':palette[n.kind]||'#ccc');
  if(n.image){
   const clipId='clip-'+n.id.replace(/[^a-zA-Z0-9_-]/g,'');
   defs.append('clipPath').attr('id',clipId).append('circle').attr('r',Math.max(5,n.r-2));
   g.append('image').attr('class','node-photo')
    .attr('href',n.image).attr('x',-n.r+2).attr('y',-n.r+2)
    .attr('width',n.r*2-4).attr('height',n.r*2-4)
    .attr('preserveAspectRatio','xMidYMid slice').attr('clip-path',`url(#${clipId})`);
  }else if(osm){
   g.append('text').attr('class','osm-label').attr('text-anchor','middle').attr('dy','.35em').text('OSM-SP');
  }else if(n.kind==='Pessoa'){
   g.append('text').attr('class','lj-fallback').attr('text-anchor','middle').attr('dy','.35em').text(initials(n.fullLabel));
  }
  const lbl=g.append('text').attr('class','node-label').attr('text-anchor','middle').attr('y',n.r+17);
  for(const [i,line]of labelLines(n.fullLabel).entries())lbl.append('tspan').attr('x',0).attr('dy',i?14:0).text(line);
  g.append('title').text(n.fullLabel+' · '+n.kind+' · '+(degrees.get(n.id)||0)+' conexões nesta visão');
 });
 let selectedId=null;
 const relatedNodes=id=>{
  const set=new Set(id?[id]:[]);
  if(id)for(const e of links){const a=e.source.id||e.source,b=e.target.id||e.target;
   if(a===id)set.add(b);if(b===id)set.add(a);}
  return set;
 };
 function applyFocus(id){
  const close=id?relatedNodes(id):null;
  groups.classed('atlas-dimmed',n=>!!id&&!close.has(n.id))
   .classed('atlas-selected',n=>!!id&&n.id===id)
   .classed('atlas-linked',n=>!!id&&close.has(n.id)&&n.id!==id);
  edge.classed('atlas-dimmed',e=>!!id&&!(e.source.id===id||e.target.id===id))
   .classed('atlas-highlight-link',e=>!!id&&(e.source.id===id||e.target.id===id));
  groups.select('text.node-label').style('display',n=>{
   if(n.kind==='Pessoa')return 'block';
   if(n.id===id)return 'block';
   return orgMode?'block':'none';
  });
 }
 function focus(id,opts={}){
  selectedId=id||null;
  simulation.stop();
  applyFocus(selectedId);
 }
 groups.on('mouseenter',(event,n)=>{if(!selectedId)applyFocus(n.id);})
  .on('mouseleave',()=>{applyFocus(selectedId);});
 groups.on('click',(event,n)=>{event.stopPropagation();focus(n.id,{lock:n.id==='M001'});onSelect(n.id,n.kind);})
  .on('keydown',(event,n)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focus(n.id,{lock:n.id==='M001'});onSelect(n.id,n.kind);}});
 svg.on('click',event=>{if(event.target===svg.node()){
  selectedId=null;applyFocus(null);simulation.alpha(.07).restart();onSelect('',null);
 }});
 groups.call(d3.drag()
  .on('start',(event,n)=>{if(!event.active)simulation.alphaTarget(.12).restart();n.fx=n.x;n.fy=n.y;})
  .on('drag',(event,n)=>{n.fx=event.x;n.fy=event.y;})
  .on('end',(event,n)=>{if(!event.active)simulation.alphaTarget(0);n.fx=null;n.fy=null;if(selectedId==='M001')simulation.stop();}));
 const simulation=d3.forceSimulation(nodes)
  .force('links',d3.forceLink(links).id(n=>n.id)
   .distance(l=>(l.source.kind==='Pessoa'&&l.target.kind==='Pessoa'?140:185))
   .strength(l=>(l.source.id==='M001'||l.target.id==='M001'?.13:.22)))
  .force('charge',d3.forceManyBody().strength(n=>n.id==='M001'?-430:n.kind==='Pessoa'?-245:-115).distanceMax(980))
  .force('collide',d3.forceCollide(n=>n.r+(n.kind==='Pessoa'?25:9)).iterations(2))
  .force('center',d3.forceCenter(width/2,height/2))
  .force('x',d3.forceX(width/2).strength(.018))
  .force('y',d3.forceY(height/2).strength(.018))
  .velocityDecay(.59)
  .on('tick',()=>{
   edge.attr('x1',l=>l.source.x).attr('y1',l=>l.source.y)
    .attr('x2',l=>l.target.x).attr('y2',l=>l.target.y);
   groups.attr('transform',n=>`translate(${n.x},${n.y})`);
  });
 // Mostrar apenas rótulos pessoais até o usuário pedir uma organização.
 applyFocus(null);
 const handler={
  redraw(){svg.node()?.getBoundingClientRect();},
  focus(id,opts){focus(id,opts||{});},
  clearFocus(){focus(null,{release:true});},
  fit(){svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity);},
  destroy(){nodes.forEach(n=>positions.set(n.id,{x:n.x,y:n.y}));simulation.stop();svg.remove();}
 };
 previous=handler;
 return handler;
}
window.drawAtlasD3Graph=draw;
})();
