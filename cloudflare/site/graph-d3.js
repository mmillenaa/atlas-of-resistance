/*
 * Atlas da Resistência — grafo de força inspirado na estratégia visual do Linked Jazz.
 * Usa D3.js v7, SVG e forças; código independente e sem dependência do repositório Linked Jazz.
 * Nós/arestas são passados pelo app.js; não contém dados históricos.
 */
(function(){
'use strict';
const positions=new Map();
let previous=null;
function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const palette={'Pessoa':'#9D2235','Movimento':'#d1b078','Instituição':'#c5cbd1','Documento':'#e0e0e0','Evento':'#96b4c3','Conceito':'#c4b3da','Local':'#afc5b7'};
function degreeMap(edges){const m=new Map();edges.forEach(e=>{m.set(e.from,(m.get(e.from)||0)+1);m.set(e.to,(m.get(e.to)||0)+1);});return m;}
function initials(label){return String(label||'').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();}
function radius(node,degrees){
 const d=degrees.get(node.id)||0;
 if(node.id==='M001')return 53;
 if(node.group==='Pessoa')return Math.max(26,Math.min(43,27+Math.sqrt(d)*4));
 if(node.group==='Movimento')return Math.max(21,Math.min(38,21+Math.sqrt(d)*3.5));
 return Math.max(14,Math.min(27,14+Math.sqrt(d)*3));
}
function draw(nodeRows,edgeRows,onSelect){
 const parent=document.getElementById('network');
 if(!parent||!window.d3)return null;
 if(previous?.destroy)previous.destroy();
 parent.textContent='';
 const width=1500,height=1020;
 const d3=window.d3;
 const degree=degreeMap(edgeRows);
 const ids=new Set(nodeRows.map(n=>n.id));
 const nodes=nodeRows.map((n,i)=>{
   const last=positions.get(n.id);
   // Deterministic, low-overlap seed. Do not force people into a circular crown.
   const a=i*2.399963229728653,dist=30+Math.sqrt(i)*35;
   return {...n,kind:n.group,fullLabel:n.fullLabel||n.label||'',r:radius(n,degree),
     x:last?.x ?? width/2+dist*Math.cos(a),
     y:last?.y ?? height/2+dist*Math.sin(a),
     vx:0,vy:0};
 });
 const links=edgeRows.filter(l=>ids.has(l.from)&&ids.has(l.to)).map(e=>({...e,source:e.from,target:e.to}));
 const svg=d3.select(parent).append('svg')
   .attr('viewBox',`0 0 ${width} ${height}`)
   .attr('role','img').attr('aria-label','Rede interativa de pessoas, movimentos e instituições');
 const plot=svg.append('g').attr('class','lj-viewport');
 const edgeLayer=plot.append('g').attr('class','lj-links');
 const nodeLayer=plot.append('g').attr('class','lj-nodes');
 const zoom=d3.zoom().scaleExtent([0.28,3.4]).on('zoom',e=>plot.attr('transform',e.transform));
 svg.call(zoom).on('dblclick.zoom',null);
 const edge=edgeLayer.selectAll('line').data(links).enter().append('line')
   .attr('class','lj-edge')
   .attr('stroke-dasharray',d=>/proposta|revisão|pesquisadora/i.test(d.title||'')?'4 4':null);
 edge.append('title').text(d=>d.title.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' '));
 const defs=svg.append('defs');
 const box=nodeLayer.selectAll('g.lj-node').data(nodes,d=>d.id).enter().append('g')
   .attr('class','lj-node').attr('tabindex',0).attr('role','button')
   .attr('aria-label',d=>d.fullLabel||d.id);
 box.each(function(d){
   const g=d3.select(this);const isOSM=d.id==='M001';
   g.append('circle').attr('r',d.r).attr('class',isOSM?'member-highlight':null)
     .attr('fill',isOSM?'#9D2235':palette[d.kind]||'#ccc');
   if(d.image){
     const clipId='clip-'+d.id.replace(/[^a-zA-Z0-9_-]/g,'');
     defs.append('clipPath').attr('id',clipId).append('circle').attr('r',Math.max(5,d.r-2));
     g.append('image').attr('class','node-photo')
       .attr('href',d.image)
       .attr('x',-d.r+2).attr('y',-d.r+2)
       .attr('width',d.r*2-4).attr('height',d.r*2-4)
       .attr('preserveAspectRatio','xMidYMid slice')
       .attr('clip-path',`url(#${clipId})`);
   }else if(isOSM){
     g.append('text').attr('class','osm-label').attr('text-anchor','middle').attr('dy','.35em').text('OSM-SP');
   }else if(d.kind==='Pessoa'){
     g.append('text').attr('class','lj-fallback').text(initials(d.fullLabel));
   }
   const showLabel=isOSM||(d.kind==='Pessoa' && (degree.get(d.id)||0)>=3)||
     (d.kind==='Movimento'&&(degree.get(d.id)||0)>1)||
     ['I005','I008','I107','I108','I116','I119'].includes(d.id);
   if(showLabel){
     g.append('text').attr('class','node-label').attr('text-anchor','middle')
       .attr('y',d.r+16).text(d.fullLabel.length>33?d.fullLabel.slice(0,32)+'…':d.fullLabel);
   }
   g.append('title').text((d.fullLabel||d.id)+' · '+d.kind+' · '+(degree.get(d.id)||0)+' conexões');
 });
 // On hover dim unrelated branches; expand from click to read biographical card.
 box.on('mouseenter',(_,d)=>{
   const related=new Set([d.id]);links.forEach(l=>{const a=l.source.id||l.source,b=l.target.id||l.target;if(a===d.id)related.add(b);if(b===d.id)related.add(a);});
   box.style('opacity',n=>related.has(n.id)?1:.25);
   edge.style('stroke-opacity',l=>{const a=l.source.id||l.source,b=l.target.id||l.target;return a===d.id||b===d.id?.75:.08;});
 }).on('mouseleave',()=>{box.style('opacity',1);edge.style('stroke-opacity',null);});
 box.on('click',(_,d)=>onSelect(d.id)).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(d.id);}});
 box.call(d3.drag()
   .on('start',(event,d)=>{if(!event.active)simulation.alphaTarget(.12).restart();d.fx=d.x;d.fy=d.y;})
   .on('drag',(event,d)=>{d.fx=event.x;d.fy=event.y;})
   .on('end',(event,d)=>{if(!event.active)simulation.alphaTarget(0);d.fx=null;d.fy=null;}));
 const simulation=d3.forceSimulation(nodes)
   .force('links',d3.forceLink(links).id(n=>n.id)
      .distance(l=>l.source.kind==='Pessoa'&&l.target.kind==='Pessoa'?130:175)
      .strength(l=>l.source.id==='M001'||l.target.id==='M001'?.13:.25))
   .force('charge',d3.forceManyBody().strength(n=>n.id==='M001'?-480:-180).distanceMax(950))
   .force('collide',d3.forceCollide(n=>n.r+11).iterations(2))
   .force('center',d3.forceCenter(width/2,height/2))
   .force('x',d3.forceX(width/2).strength(.017))
   .force('y',d3.forceY(height/2).strength(.017))
   .velocityDecay(.56)
   .on('tick',()=>{
     edge.attr('x1',l=>l.source.x).attr('y1',l=>l.source.y)
       .attr('x2',l=>l.target.x).attr('y2',l=>l.target.y);
     box.attr('transform',d=>`translate(${d.x},${d.y})`);
   })
   .on('end',()=>{nodes.forEach(n=>positions.set(n.id,{x:n.x,y:n.y}));});
 // Preserve positions when users explore a node, rather than returning to one radial layout.
 const handler={
   redraw(){svg.node()?.getBoundingClientRect();},
   fit(){const t=d3.zoomIdentity;svg.transition().duration(350).call(zoom.transform,t);},
   destroy(){
      nodes.forEach(n=>positions.set(n.id,{x:n.x,y:n.y}));
      simulation.stop();svg.remove();
   }
 };
 previous=handler;
 return handler;
}
window.drawAtlasD3Graph=draw;
})();
