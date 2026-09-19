import{c as l}from"./index-DmsBMrBR.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=l("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=l("Bike",[["circle",{cx:"18.5",cy:"17.5",r:"3.5",key:"15x4ox"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5",key:"1noe27"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2",key:"1npguv"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=l("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=l("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=l("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=l("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=l("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);function H(u,v){let n;try{n=u()}catch{return}return{getItem:o=>{var t;const d=h=>h===null?null:JSON.parse(h,void 0),s=(t=n.getItem(o))!=null?t:null;return s instanceof Promise?s.then(d):d(s)},setItem:(o,t)=>n.setItem(o,JSON.stringify(t,void 0)),removeItem:o=>n.removeItem(o)}}const I=u=>v=>{try{const n=u(v);return n instanceof Promise?n:{then(r){return I(r)(n)},catch(r){return this}}}catch(n){return{then(r){return this},catch(r){return I(r)(n)}}}},_=(u,v)=>(n,r,o)=>{let t={storage:H(()=>window.localStorage),partialize:e=>e,version:0,merge:(e,y)=>({...y,...e}),...v},d=!1,s=0;const h=new Set,k=new Set;let c=t.storage;if(!c)return u((...e)=>{console.warn(`[zustand persist middleware] Unable to update item '${t.name}', the given storage is currently unavailable.`),n(...e)},r,o);const g=()=>{const e=t.partialize({...r()});return c.setItem(t.name,{state:e,version:t.version})},w=o.setState;o.setState=(e,y)=>(w(e,y),g());const m=u((...e)=>(n(...e),g()),r,o);o.getInitialState=()=>m;let p;const M=()=>{var e,y;if(!c)return;const S=++s;d=!1,h.forEach(a=>{var i;return a((i=r())!=null?i:m)});const f=((y=t.onRehydrateStorage)==null?void 0:y.call(t,(e=r())!=null?e:m))||void 0;return I(c.getItem.bind(c))(t.name).then(a=>{if(a)if(typeof a.version=="number"&&a.version!==t.version){if(t.migrate){const i=t.migrate(a.state,a.version);return i instanceof Promise?i.then(x=>[!0,x]):[!0,i]}console.error("State loaded from storage couldn't be migrated since no migrate function was provided")}else return[!1,a.state];return[!1,void 0]}).then(a=>{var i;if(S!==s)return;const[x,b]=a;if(p=t.merge(b,(i=r())!=null?i:m),n(p,!0),x)return g()}).then(()=>{S===s&&(f?.(r(),void 0),p=r(),d=!0,k.forEach(a=>a(p)))}).catch(a=>{S===s&&f?.(void 0,a)})};return o.persist={setOptions:e=>{t={...t,...e},e.storage&&(c=e.storage)},clearStorage:()=>{++s,c?.removeItem(t.name)},getOptions:()=>t,rehydrate:()=>M(),hasHydrated:()=>d,onHydrate:e=>(h.add(e),()=>{h.delete(e)}),onFinishHydration:e=>(k.add(e),()=>{k.delete(e)})},t.skipHydration||M(),p||m},F=_;export{R as A,q as B,A as M,j as P,U as S,B as U,L as a,F as p};
