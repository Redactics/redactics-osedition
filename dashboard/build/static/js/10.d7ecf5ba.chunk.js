(this.webpackJsonpredactics=this.webpackJsonpredactics||[]).push([[10],{581:function(e,t,a){"use strict";var r=a(1),n=a(4),o=a(0),i=(a(3),a(5)),l=a(191),c=a(6),s=o.forwardRef((function(e,t){var a=e.classes,c=e.className,s=e.raised,u=void 0!==s&&s,m=Object(n.a)(e,["classes","className","raised"]);return o.createElement(l.a,Object(r.a)({className:Object(i.a)(a.root,c),elevation:u?8:1,ref:t},m))}));t.a=Object(c.a)({root:{overflow:"hidden"}},{name:"MuiCard"})(s)},582:function(e,t,a){"use strict";var r=a(1),n=a(4),o=a(0),i=(a(3),a(5)),l=a(6),c=a(11),s=o.forwardRef((function(e,t){var a=e.absolute,l=void 0!==a&&a,c=e.classes,s=e.className,u=e.component,m=void 0===u?"hr":u,d=e.flexItem,b=void 0!==d&&d,p=e.light,f=void 0!==p&&p,h=e.orientation,g=void 0===h?"horizontal":h,v=e.role,E=void 0===v?"hr"!==m?"separator":void 0:v,y=e.variant,k=void 0===y?"fullWidth":y,w=Object(n.a)(e,["absolute","classes","className","component","flexItem","light","orientation","role","variant"]);return o.createElement(m,Object(r.a)({className:Object(i.a)(c.root,s,"fullWidth"!==k&&c[k],l&&c.absolute,b&&c.flexItem,f&&c.light,"vertical"===g&&c.vertical),role:E,ref:t},w))}));t.a=Object(l.a)((function(e){return{root:{height:1,margin:0,border:"none",flexShrink:0,backgroundColor:e.palette.divider},absolute:{position:"absolute",bottom:0,left:0,width:"100%"},inset:{marginLeft:72},light:{backgroundColor:Object(c.c)(e.palette.divider,.08)},middle:{marginLeft:e.spacing(2),marginRight:e.spacing(2)},vertical:{height:"100%",width:1},flexItem:{alignSelf:"stretch",height:"auto"}}}),{name:"MuiDivider"})(s)},586:function(e,t,a){"use strict";var r=a(1),n=a(4),o=a(0),i=(a(3),a(5)),l=a(6),c=o.forwardRef((function(e,t){var a=e.classes,l=e.className,c=e.component,s=void 0===c?"div":c,u=Object(n.a)(e,["classes","className","component"]);return o.createElement(s,Object(r.a)({className:Object(i.a)(a.root,l),ref:t},u))}));t.a=Object(l.a)({root:{padding:16,"&:last-child":{paddingBottom:24}}},{name:"MuiCardContent"})(c)},588:function(e,t,a){"use strict";var r=a(1),n=a(4),o=a(0),i=(a(3),a(5)),l=a(8),c=a(6),s=a(202),u=a(27),m=a(84),d=o.forwardRef((function(e,t){var a=e.classes,c=e.className,d=e.color,b=void 0===d?"primary":d,p=e.component,f=void 0===p?"a":p,h=e.onBlur,g=e.onFocus,v=e.TypographyClasses,E=e.underline,y=void 0===E?"hover":E,k=e.variant,w=void 0===k?"inherit":k,j=Object(n.a)(e,["classes","className","color","component","onBlur","onFocus","TypographyClasses","underline","variant"]),O=Object(s.a)(),x=O.isFocusVisible,C=O.onBlurVisible,S=O.ref,I=o.useState(!1),M=I[0],T=I[1],N=Object(u.a)(t,S);return o.createElement(m.a,Object(r.a)({className:Object(i.a)(a.root,a["underline".concat(Object(l.a)(y))],c,M&&a.focusVisible,"button"===f&&a.button),classes:v,color:b,component:f,onBlur:function(e){M&&(C(),T(!1)),h&&h(e)},onFocus:function(e){x(e)&&T(!0),g&&g(e)},ref:N,variant:w},j))}));t.a=Object(c.a)({root:{},underlineNone:{textDecoration:"none"},underlineHover:{textDecoration:"none","&:hover":{textDecoration:"underline"}},underlineAlways:{textDecoration:"underline"},button:{position:"relative",WebkitTapHighlightColor:"transparent",backgroundColor:"transparent",outline:0,border:0,margin:0,borderRadius:0,padding:0,cursor:"pointer",userSelect:"none",verticalAlign:"middle","-moz-appearance":"none","-webkit-appearance":"none","&::-moz-focus-inner":{borderStyle:"none"},"&$focusVisible":{outline:"auto"}},focusVisible:{}},{name:"MuiLink"})(d)},635:function(e,t,a){"use strict";a.r(t);var r=a(65),n=a.n(r),o=a(101),i=a(85),l=a(86),c=a(58),s=a(88),u=a(87),m=a(0),d=a.n(m),b=a(10),p=a(197),f=a.n(p),h=a(587),g=a.n(h),v=a(153),E=a(151),y=a(581),k=a(582),w=a(545),j=a(541),O=a(558),x=a(1),C=a(4),S=(a(3),a(5)),I=a(8),M=a(6),T=a(11),N=a(33),D=m.forwardRef((function(e,t){var a=e.classes,r=e.className,n=e.color,o=void 0===n?"primary":n,i=e.value,l=e.valueBuffer,c=e.variant,s=void 0===c?"indeterminate":c,u=Object(C.a)(e,["classes","className","color","value","valueBuffer","variant"]),d=Object(N.a)(),b={},p={bar1:{},bar2:{}};if("determinate"===s||"buffer"===s)if(void 0!==i){b["aria-valuenow"]=Math.round(i);var f=i-100;"rtl"===d.direction&&(f=-f),p.bar1.transform="translateX(".concat(f,"%)")}else 0;if("buffer"===s)if(void 0!==l){var h=(l||0)-100;"rtl"===d.direction&&(h=-h),p.bar2.transform="translateX(".concat(h,"%)")}else 0;return m.createElement("div",Object(x.a)({className:Object(S.a)(a.root,a["color".concat(Object(I.a)(o))],r,{determinate:a.determinate,indeterminate:a.indeterminate,buffer:a.buffer,query:a.query}[s]),role:"progressbar"},b,{ref:t},u),"buffer"===s?m.createElement("div",{className:Object(S.a)(a.dashed,a["dashedColor".concat(Object(I.a)(o))])}):null,m.createElement("div",{className:Object(S.a)(a.bar,a["barColor".concat(Object(I.a)(o))],("indeterminate"===s||"query"===s)&&a.bar1Indeterminate,{determinate:a.bar1Determinate,buffer:a.bar1Buffer}[s]),style:p.bar1}),"determinate"===s?null:m.createElement("div",{className:Object(S.a)(a.bar,("indeterminate"===s||"query"===s)&&a.bar2Indeterminate,"buffer"===s?[a["color".concat(Object(I.a)(o))],a.bar2Buffer]:a["barColor".concat(Object(I.a)(o))]),style:p.bar2}))})),B=Object(M.a)((function(e){var t=function(t){return"light"===e.palette.type?Object(T.e)(t,.62):Object(T.a)(t,.5)},a=t(e.palette.primary.main),r=t(e.palette.secondary.main);return{root:{position:"relative",overflow:"hidden",height:4},colorPrimary:{backgroundColor:a},colorSecondary:{backgroundColor:r},determinate:{},indeterminate:{},buffer:{backgroundColor:"transparent"},query:{transform:"rotate(180deg)"},dashed:{position:"absolute",marginTop:0,height:"100%",width:"100%",animation:"$buffer 3s infinite linear"},dashedColorPrimary:{backgroundImage:"radial-gradient(".concat(a," 0%, ").concat(a," 16%, transparent 42%)"),backgroundSize:"10px 10px",backgroundPosition:"0px -23px"},dashedColorSecondary:{backgroundImage:"radial-gradient(".concat(r," 0%, ").concat(r," 16%, transparent 42%)"),backgroundSize:"10px 10px",backgroundPosition:"0px -23px"},bar:{width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left"},barColorPrimary:{backgroundColor:e.palette.primary.main},barColorSecondary:{backgroundColor:e.palette.secondary.main},bar1Indeterminate:{width:"auto",animation:"$indeterminate1 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite"},bar1Determinate:{transition:"transform .".concat(4,"s linear")},bar1Buffer:{zIndex:1,transition:"transform .".concat(4,"s linear")},bar2Indeterminate:{width:"auto",animation:"$indeterminate2 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite"},bar2Buffer:{transition:"transform .".concat(4,"s linear")},"@keyframes indeterminate1":{"0%":{left:"-35%",right:"100%"},"60%":{left:"100%",right:"-90%"},"100%":{left:"100%",right:"-90%"}},"@keyframes indeterminate2":{"0%":{left:"-200%",right:"100%"},"60%":{left:"107%",right:"-8%"},"100%":{left:"107%",right:"-8%"}},"@keyframes buffer":{"0%":{opacity:1,backgroundPosition:"0px -23px"},"50%":{opacity:0,backgroundPosition:"0px -23px"},"100%":{opacity:1,backgroundPosition:"-200px -23px"}}}}),{name:"MuiLinearProgress"})(D),z=a(523),F=a(84),L=a(588),P=a(565),R=a(536),A=a(537),W=a(538),q=a(539),J=a(540),V=a(586),$=a(625),_=a(57),H=Object(_.a)(d.a.createElement("path",{d:"M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"}),"ErrorOutline"),Q=a(562),U=a(122),X=Object(b.c)(y.a)(Q.b),Y=Object(b.c)(k.a)(Q.b),G=Object(b.c)(w.a)(Q.b),K=Object(b.c)(j.a)(Q.b),Z=function(e){Object(s.a)(a,e);var t=Object(u.a)(a);function a(e){var r;return Object(i.a)(this,a),(r=t.call(this,e)).state={dataFetched:!1,jobs:[],fbSubs:[],stackTrace:"",showException:!1},r.showException=r.showException.bind(Object(c.a)(r)),r.hideDialog=r.hideDialog.bind(Object(c.a)(r)),r}return Object(l.a)(a,[{key:"componentDidMount",value:function(){this.refreshJobListing()}},{key:"showException",value:function(e,t){e.preventDefault(),this.setState({showException:!0,stackTrace:t.stackTrace})}},{key:"hideDialog",value:function(){this.setState({showException:!1})}},{key:"refreshJobListing",value:function(){var e=Object(o.a)(n.a.mark((function e(){var t,a,r=this;return n.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,e.next=3,fetch("".concat(this.context.apiUrl,"/workflow/jobs"),{credentials:"include"});case 3:return t=e.sent,e.next=6,t.json();case 6:(a=e.sent).forEach((function(e){"inProgress"!==e.status&&"queued"!==e.status||r.initFirebaseSubscription(e.uuid)})),this.setState({jobs:a,dataFetched:!0}),e.next=13;break;case 11:e.prev=11,e.t0=e.catch(0);case 13:case"end":return e.stop()}}),e,this,[[0,11]])})));return function(){return e.apply(this,arguments)}}()},{key:"initFirebaseSubscription",value:function(e){}},{key:"progressBar",value:function(e){return e.progress&&e.progress<100?d.a.createElement(O.a,{mt:4},d.a.createElement(B,{variant:"determinate",value:e.progress})):null}},{key:"statusIcon",value:function(e){switch(e.status){case"inProgress":case"queued":return d.a.createElement(z.a,null);case"completed":return d.a.createElement($.a,{style:{color:v.a[500],fontSize:50}});case"error":return d.a.createElement(H,{style:{color:E.a[500],fontSize:50}})}}},{key:"workflowType",value:function(e){switch(e.workflowType){case"ERL":return d.a.createElement(F.a,{variant:"h5",gutterBottom:!0},"ERL (Extract, Redact, Load)");case"sampletable-athletes":return d.a.createElement(F.a,{variant:"h5",gutterBottom:!0},"Install Sample Table: Athletes");case"sampletable-marketing_campaign":return d.a.createElement(F.a,{variant:"h5",gutterBottom:!0},"Install Sample Table: Marketing Campaign");case"mockDatabaseMigration":return d.a.createElement(F.a,{variant:"h5",gutterBottom:!0},"Database Clone for Migration Dry-run")}}},{key:"displayFile",value:function(e){var t=e.split("/");return t[t.length-1]}},{key:"workflowInfo",value:function(e){return e.workflowId?d.a.createElement(O.a,null,"Workflow: ",e.workflowName," (",d.a.createElement("code",null,e.workflowId),")"):null}},{key:"results",value:function(e){var t=this,a=null,r=null;if("completed"===e.status&&e.createdAt!==e.lastTaskEnd)"piiscanner"===e.workflowType?r=d.a.createElement("span",null,"Access the ",d.a.createElement(L.a,{href:"/usecases/piiscanner",target:"_blank"},"PII Scanner")," page to view the results of this scan."):"usersearch"===e.workflowType&&(r=d.a.createElement("span",null,"Access the generated SQL via the ",d.a.createElement("code",null,"download-export")," Redactics CLI command, and the receipt of this SQL generation ",d.a.createElement(L.a,{href:"/usecases/forgetuser",target:"_blank"},"here"),".")),a=e.outputLinks?d.a.createElement(O.a,null,d.a.createElement(O.a,null,d.a.createElement("b",null,"Completed in ",d.a.createElement(g.a,{duration:e.createdAt,date:e.lastTaskEnd})),". ",e.outputSummary||r),d.a.createElement(O.a,{mt:2},d.a.createElement("ul",null,e.outputLinks.map((function(e){return d.a.createElement("li",null,d.a.createElement(L.a,{href:e,target:"_blank"},t.displayFile(e)))}))))):d.a.createElement(O.a,null,d.a.createElement("b",null,"Completed in ",d.a.createElement(g.a,{duration:e.createdAt,date:e.lastTaskEnd})),". ",e.outputSummary||r);else if("error"===e.status){var n=e.exception&&e.exception.length>150?e.exception.substring(0,149)+"...":e.exception;a=d.a.createElement(O.a,null,d.a.createElement(L.a,{href:"#",onClick:function(a){return t.showException(a,e)}},d.a.createElement("b",null,n)))}return a?d.a.createElement(O.a,{mt:4},a):null}},{key:"initialCopies",value:function(e){if(e.outputMetadata&&e.outputMetadata.initialCopies&&e.outputMetadata.initialCopies.length)return d.a.createElement(O.a,{mt:4},d.a.createElement("b",null,"Full Copied Tables"),d.a.createElement(O.a,{mt:4},e.outputMetadata.initialCopies.map((function(e){return d.a.createElement(O.a,{display:"inline",mr:1},d.a.createElement(P.a,{key:e,label:e,variant:"outlined",color:"primary",size:"small"}))}))))}},{key:"copySummary",value:function(e){if(e.outputMetadata&&e.outputMetadata.copySummary&&e.outputMetadata.copySummary.length)return d.a.createElement(O.a,{mt:4},d.a.createElement("b",null,"Copy Summary"),d.a.createElement(O.a,{mt:4},d.a.createElement("ul",null,e.outputMetadata.copySummary.map((function(e){return d.a.createElement("li",null,e)})))))}},{key:"deltaCopies",value:function(e){if(e.outputMetadata&&e.outputMetadata.deltaCopies&&e.outputMetadata.deltaCopies.length)return d.a.createElement(O.a,{mt:4},d.a.createElement("b",null,"Delta Copied Tables"),d.a.createElement(O.a,{mt:4},e.outputMetadata.deltaCopies.map((function(e){return d.a.createElement(O.a,{display:"inline",mr:1},d.a.createElement(P.a,{key:e,label:e,variant:"outlined",color:"primary",size:"small"}))}))))}},{key:"render",value:function(){var e=this;return d.a.createElement(d.a.Fragment,null,d.a.createElement(f.a,{title:"Workflow Jobs"}),d.a.createElement(F.a,{variant:"h1",gutterBottom:!0,display:"inline"},"Workflow Jobs"),d.a.createElement(Y,{my:6}),d.a.createElement(R.a,{open:this.state.showException,onClose:this.hideDialog,maxWidth:"lg","aria-labelledby":"dialog-title","aria-describedby":"dialog-description"},d.a.createElement(A.a,{id:"dialog-title"},"Error Stacktrace"),d.a.createElement(W.a,null,d.a.createElement(q.a,{id:"dialog-description"},this.state.stackTrace.split("\n").map((function(e,t){return d.a.createElement(d.a.Fragment,{key:"".concat(e,"-").concat(t)},e,d.a.createElement("br",null))}))),d.a.createElement(J.a,null,d.a.createElement(K,{color:"primary",onClick:this.hideDialog},"Close")))),this.state.jobs.map((function(t){return d.a.createElement(O.a,{mb:4,key:t.uuid},d.a.createElement(X,null,d.a.createElement(V.a,null,d.a.createElement(G,{justify:"space-between",container:!0,spacing:10},d.a.createElement(G,{item:!0,xs:1},e.statusIcon(t)),d.a.createElement(G,{item:!0,xs:11},e.workflowType(t),e.workflowInfo(t),"Created: ",d.a.createElement(g.a,{fromNow:!0},new Date(t.createdAt)),e.progressBar(t),e.results(t),e.deltaCopies(t),e.initialCopies(t),e.copySummary(t))))))})),!this.state.dataFetched||this.state.jobs&&this.state.jobs.length?null:d.a.createElement(X,{mt:8},d.a.createElement(V.a,null,'You have no workflow jobs yet. Jobs will appear here after the time the job has been scheduled for, or when run manually. These not include jobs created in the "Workflows" section, but PII Scanner and Forget User jobs as well.')))}}]),a}(d.a.Component);Z.contextType=U.a;t.default=Z}}]);
//# sourceMappingURL=10.d7ecf5ba.chunk.js.map