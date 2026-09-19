import{j as e,m as s}from"./motion-phs_KTcB.js";import{r as u}from"./react-CuA7wYB5.js";import{r as b,a}from"./index-DmsBMrBR.js";function w({status:n,now:i,compact:t,className:d}){const o=u.useId().replace(/:/g,""),c=Math.max(n.windowEnd-n.windowStart,1),x=i>=n.windowStart&&i<n.windowEnd,m=n.isOpen&&x?Math.min(Math.max((i-n.windowStart)/c,0),1):0,p=n.manual?n.isOpen?"Open":"Closed":n.msToChange!=null?b(n.msToChange):"",f=n.manual?n.isOpen?"The store opened early tonight":"Taking a short break tonight":n.isOpen?"left to order tonight":"until we open",r=104,l=2*Math.PI*r,h=l*(1-m);return e.jsxs("div",{className:a("relative flex flex-col items-center",d),children:[!t&&e.jsxs("div",{className:"mb-3 flex w-full items-center justify-between px-2",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] font-semibold uppercase tracking-[0.22em] text-muted",children:"Night window"}),e.jsxs("p",{className:"mt-1 text-sm font-semibold text-fg",children:["9 PM"," ",e.jsx("span",{className:"text-muted",children:"→"})," ","2 AM"]})]}),e.jsxs("span",{className:a("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",n.isOpen?n.closingSoon?"bg-amber/10 text-amber":"bg-lime/10 text-lime":"bg-pink/10 text-pink"),children:[e.jsxs("span",{className:"relative flex h-1.5 w-1.5",children:[n.isOpen&&e.jsx("span",{className:"pulse-ring absolute inset-0 rounded-full bg-current"}),e.jsx("span",{className:"relative h-1.5 w-1.5 rounded-full bg-current"})]}),n.isOpen?n.closingSoon?"Closing soon":"Open now":"Closed"]})]}),e.jsxs("div",{className:a("relative aspect-square w-full",t?"max-w-[230px]":"max-w-[320px]"),children:[e.jsx(s.div,{className:a("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full","bg-violet/10 blur-3xl",t?"h-32 w-32":"h-48 w-48"),animate:{scale:[1,1.08,1],opacity:[.45,.7,.45]},transition:{duration:4,repeat:1/0,ease:"easeInOut"}}),e.jsx(s.div,{className:`
            absolute
            inset-[8%]
            rounded-full
            border
            border-violet/20
          `,animate:{rotate:360},transition:{duration:35,repeat:1/0,ease:"linear"},children:e.jsx("span",{className:`
              absolute
              left-1/2
              top-0
              h-2.5
              w-2.5
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-cyan
              shadow-[0_0_18px_rgb(var(--cyan)/.8)]
            `})}),e.jsx(s.div,{className:`
            absolute
            inset-[18%]
            rounded-full
            border
            border-line/60
          `,animate:{rotate:-360},transition:{duration:50,repeat:1/0,ease:"linear"},children:e.jsx("span",{className:`
              absolute
              bottom-[8%]
              left-[12%]
              h-1.5
              w-1.5
              rounded-full
              bg-violet
              shadow-[0_0_14px_rgb(var(--violet)/.8)]
            `})}),e.jsxs("svg",{viewBox:"0 0 240 240",className:`
            absolute
            inset-0
            h-full
            w-full
            -rotate-90
          `,"aria-hidden":!0,children:[e.jsx("defs",{children:e.jsxs("linearGradient",{id:`night-progress-${o}`,x1:"0",y1:"0",x2:"1",y2:"1",children:[e.jsx("stop",{offset:"0%",stopColor:"rgb(var(--violet))"}),e.jsx("stop",{offset:"50%",stopColor:"rgb(var(--cyan))"}),e.jsx("stop",{offset:"100%",stopColor:"rgb(var(--lime))"})]})}),e.jsx("circle",{cx:"120",cy:"120",r,fill:"none",stroke:"rgb(var(--line) / .55)",strokeWidth:"2"}),n.isOpen&&e.jsx(s.circle,{cx:"120",cy:"120",r,fill:"none",stroke:`url(#night-progress-${o})`,strokeWidth:"3",strokeLinecap:"round",strokeDasharray:l,initial:{strokeDashoffset:l},animate:{strokeDashoffset:h},transition:{duration:1.2,ease:[.22,1,.36,1]}})]}),e.jsxs("div",{className:`
            absolute
            inset-0
            flex
            flex-col
            items-center
            justify-center
            text-center
          `,children:[e.jsxs(s.div,{className:a("relative mb-4 grid place-items-center rounded-full","border border-violet/20","bg-surface/80","backdrop-blur-md","shadow-[0_0_40px_rgb(var(--violet)/.12)]",t?"h-11 w-11":"h-14 w-14"),animate:{y:[-2,2,-2]},transition:{duration:3.5,repeat:1/0,ease:"easeInOut"},children:[e.jsx("span",{className:`
                absolute
                inset-0
                rounded-full
                bg-lime/10
                blur-md
              `}),e.jsx("div",{className:a("relative rounded-full bg-lime","shadow-[0_0_22px_rgb(var(--lime)/.55)]",t?"h-4 w-4":"h-5 w-5"),children:e.jsx("div",{className:`
                  absolute
                  -right-1.5
                  -top-1
                  h-4
                  w-4
                  rounded-full
                  bg-bg
                `})})]}),e.jsx(s.span,{className:a("font-display font-extrabold tracking-[-0.05em]",t?"text-3xl":"text-[46px]"),initial:{opacity:0,y:8},animate:{opacity:1,y:0},transition:{duration:.5},children:p}),e.jsx(s.span,{className:"mt-1 text-xs text-muted",initial:{opacity:0},animate:{opacity:1},transition:{duration:.5,delay:.1},children:f})]})]}),!t&&e.jsxs("div",{className:"mt-2 flex items-center gap-2 text-[11px] text-muted",children:[e.jsx(s.span,{className:"h-1 w-1 rounded-full bg-lime",animate:{scale:[1,1.5,1],opacity:[.6,1,.6]},transition:{duration:2,repeat:1/0}}),"Late-night delivery",e.jsx("span",{className:"text-line",children:"•"}),"10–15 min"]})]})}export{w as N};
