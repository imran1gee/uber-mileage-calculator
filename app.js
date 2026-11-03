'use strict';
const $ = id => document.getElementById(id);
const fields = Object.fromEntries(['current','pickup','dropoff','home'].map(k=>[k,$(k)]));
const status = $('status'), results = $('results'), plan = $('plan');
const HOME_KEY = 'trip-home-address-v3', HOME_POINT_KEY = 'trip-home-coordinates-v3';
try { fields.home.value = localStorage.getItem(HOME_KEY) || localStorage.getItem('trip-home-address') || ''; } catch (_) {}
fields.home.addEventListener('input', () => { try { localStorage.setItem(HOME_KEY,fields.home.value);localStorage.removeItem(HOME_POINT_KEY); } catch (_) {} });
function directions(origin,destination,waypoints=[]){const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('origin',origin);u.searchParams.set('destination',destination);u.searchParams.set('travelmode','driving');if(waypoints.length)u.searchParams.set('waypoints',waypoints.join('|'));return u.toString();}
function coordPair(text){const m=text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);if(!m)return null;const lat=+m[1],lon=+m[2];return Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;}
function parseMapsText(raw){
  const text=raw.trim();const urls=text.match(/https?:\/\/[^\s<>]+/g)||[];
  if(!urls.length)return text;
  let u;try{u=new URL(urls[0].replace(/[),.;]+$/,''));}catch{return text;}
  const host=u.hostname.toLowerCase();if(!(host==='google.com'||host.endsWith('.google.com')||host==='maps.app.goo.gl'||host==='goo.gl'))return text;
  if(host==='maps.app.goo.gl'||host==='goo.gl')throw Error('This is a shortened Google Maps link. Open it in Google Maps, then copy the full address or coordinates. Short links cannot be reliably decoded in this browser.');
  for(const key of ['query','q','destination','daddr']){const v=u.searchParams.get(key);if(v){return v;}}
  const path=decodeURIComponent(u.pathname);const place=path.match(/\/maps\/(?:place|search)\/([^/]+)/);if(place){return place[1].replace(/\+/g,' ');}
  const ll=path.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);if(ll)return `${ll[1]},${ll[2]}`;
  const data=(u.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)||[]);if(data.length)return `${data[1]},${data[2]}`;
  throw Error('Cannot identify the location in this Google Maps link. Copy its street address or coordinates instead.');
}
let sharedValue='';const params=new URLSearchParams(location.search);const sharedRaw=[params.get('url'),params.get('text'),params.get('title')].filter(Boolean).join(' ');
if(sharedRaw){$('shared').hidden=false;sharedValue=sharedRaw;$('sharedText').textContent=sharedRaw.slice(0,240);status.textContent='Choose whether the shared location is pickup or drop-off.';}
function applyLocation(target,raw){try{fields[target].value=parseMapsText(raw);status.textContent='Location added to '+(target==='pickup'?'pickup':'drop-off')+'.';results.hidden=true;return true;}catch(e){status.textContent=e.message;return false;}}
$('usePickup').addEventListener('click',()=>{if(applyLocation('pickup',sharedValue))$('shared').hidden=true;});
$('useDropoff').addEventListener('click',()=>{if(applyLocation('dropoff',sharedValue))$('shared').hidden=true;});
document.querySelectorAll('.paste').forEach(b=>b.addEventListener('click',async()=>{try{const text=await navigator.clipboard.readText();applyLocation(b.dataset.target,text);}catch(e){status.textContent='Clipboard access unavailable. Long-press the field and select Paste instead.';}}));
function gps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('GPS is not supported.'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),e=>reject(Error(e.message)),{enableHighAccuracy:true,timeout:18000,maximumAge:30000});});}
$('gps').addEventListener('click',async()=>{status.textContent='Requesting location permission…';try{const p=await gps();fields.current.value=`${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;status.textContent='GPS location ready.';}catch(e){status.textContent='GPS unavailable: '+e.message;}});
const cache=new Map();let lastLookup=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function geocode(input,field){
  const normalized=parseMapsText(input);const coords=coordPair(normalized);if(coords)return coords;
  if(field==='home'){try{const saved=JSON.parse(localStorage.getItem(HOME_POINT_KEY)||'null');if(saved&&saved.address===normalized&&coordPair(`${saved.lat},${saved.lon}`))return {lat:saved.lat,lon:saved.lon};}catch(_){}}
  const key=normalized.toLowerCase();if(cache.has(key))return cache.get(key);
  await wait(Math.max(0,1150-(Date.now()-lastLookup)));lastLookup=Date.now();
  const u=new URL('https://nominatim.openstreetmap.org/search');u.searchParams.set('q',normalized);u.searchParams.set('format','jsonv2');u.searchParams.set('limit','1');
  const response=await fetch(u,{headers:{Accept:'application/json'}});if(!response.ok)throw Error('Address lookup unavailable (HTTP '+response.status+').');
  const matches=await response.json();if(!matches.length)throw Error('Address not found: '+normalized+'. Try the full street address, city and state.');
  const point={lat:+matches[0].lat,lon:+matches[0].lon};cache.set(key,point);
  if(field==='home')try{localStorage.setItem(HOME_POINT_KEY,JSON.stringify({address:normalized,...point}));}catch(_){}
  return point;
}
const miles=m=>(m/1609.344).toFixed(1)+' mi';
const minutes=s=>{const m=Math.round(s/60);return m>=60?`${Math.floor(m/60)} hr ${m%60} min`:`${m} min`;};
plan.addEventListener('click',async()=>{
  plan.disabled=true;results.hidden=true;
  try{
    if(!fields.current.value.trim()){status.textContent='Detecting current location…';const p=await gps();fields.current.value=`${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;}
    const names=['current','pickup','dropoff','home'];const values=names.map(k=>fields[k].value.trim());
    if(values.some(v=>!v))throw Error('Enter pickup, drop-off and home (current location can use GPS).');
    const points=[];for(let i=0;i<names.length;i++){status.textContent='Finding '+names[i]+' location…';points.push(await geocode(values[i],names[i]));}
    status.textContent='Calculating road distances…';const coords=points.map(p=>`${p.lon},${p.lat}`).join(';');
    const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`);
    if(!response.ok)throw Error('Routing service unavailable (HTTP '+response.status+').');
    const data=await response.json();if(data.code!=='Ok'||!data.routes?.[0]||data.routes[0].legs.length!==3)throw Error('No driving route found.');
    const route=data.routes[0];$('totalMiles').textContent=miles(route.distance);$('totalTime').textContent=minutes(route.duration);
    route.legs.forEach((leg,i)=>{$('miles'+(i+1)).textContent=miles(leg.distance);$('time'+(i+1)).textContent=minutes(leg.duration);});
    const nav=points.map(p=>`${p.lat},${p.lon}`);$('mapsLink').href=directions(nav[0],nav[3],[nav[1],nav[2]]);
    for(let i=0;i<3;i++)$('leg'+(i+1)).href=directions(nav[i],nav[i+1]);
    results.hidden=false;status.textContent='Calculated. Confirm that the resolved locations and Google Maps directions are correct.';
  }catch(e){status.textContent='Could not calculate: '+e.message;}finally{plan.disabled=false;}
});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
