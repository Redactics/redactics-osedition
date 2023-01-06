(this.webpackJsonpredactics=this.webpackJsonpredactics||[]).push([[11],{585:function(e,t,a){"use strict";var n=a(4),i=a(29),r=a(1),s=a(0),l=(a(3),a(5)),u=a(6),c=a(548),o=s.forwardRef((function(e,t){var a,i=e.classes,u=e.className,o=e.component,p=void 0===o?"li":o,d=e.disableGutters,m=void 0!==d&&d,h=e.ListItemClasses,b=e.role,E=void 0===b?"menuitem":b,f=e.selected,y=e.tabIndex,g=Object(n.a)(e,["classes","className","component","disableGutters","ListItemClasses","role","selected","tabIndex"]);return e.disabled||(a=void 0!==y?y:-1),s.createElement(c.a,Object(r.a)({button:!0,role:E,tabIndex:a,component:p,selected:f,disableGutters:m,classes:Object(r.a)({dense:i.dense},h),className:Object(l.a)(i.root,u,f&&i.selected,!m&&i.gutters),ref:t},g))}));t.a=Object(u.a)((function(e){return{root:Object(r.a)({},e.typography.body1,Object(i.a)({minHeight:48,paddingTop:6,paddingBottom:6,boxSizing:"border-box",width:"auto",overflow:"hidden",whiteSpace:"nowrap"},e.breakpoints.up("sm"),{minHeight:"auto"})),gutters:{},selected:{},dense:Object(r.a)({},e.typography.body2,{minHeight:"auto"})}}),{name:"MuiMenuItem"})(o)},594:function(e,t,a){"use strict";var n=a(0),i=a.n(n),r=a(57);t.a=Object(r.a)(i.a.createElement("path",{d:"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"}),"Edit")},611:function(e,t,a){"use strict";a.r(t);var n,i,r=a(65),s=a.n(r),l=a(101),u=a(85),c=a(86),o=a(58),p=a(88),d=a(87),m=a(14),h=a(0),b=a.n(h),E=a(10),f=a(6),y=a(197),g=a.n(y),v=a(581),S=a(582),k=a(541),I=a(637),C=a(614),D=a(592),j=a(615),w=a(558),O=a(616),x=a(642),T=a(641),L=a(631),N=a(585),z=a(542),M=a(560),A=a(84),B=a(545),q=a(586),P=a(619),R=a(620),H=a(532),J=a(621),W=a(536),G=a(537),K=a(538),V=a(539),F=a(540),X=a(636),U=a(503),Y=a(617),Q=a(618),Z=a(594),$=a(622),_=a(624),ee=a(623),te=a(632),ae=a(562),ne=a(122),ie=Object(E.c)(v.a)(ae.b),re=Object(E.c)(S.a)(ae.b),se=Object(E.c)(k.a)(ae.b),le=Object(E.c)(I.a)(ae.b),ue=Object(E.c)(C.a)(ae.b),ce=Object(E.c)(ue)(n||(n=Object(m.a)(["\n  min-width: 200px;\n  max-width: 200px;\n"]))),oe=Object(E.c)(le)(i||(i=Object(m.a)(["\n  width: 200px;\n"]))),pe=(Object(f.a)({root:{display:"block"}})(D.a),Object(f.a)({root:{whiteSpace:"nowrap"}})(j.a)),de=Object(E.c)(te.a)(ae.b),me=function(e){Object(p.a)(a,e);var t=Object(d.a)(a);function a(e){var n;return Object(u.a)(this,a),(n=t.call(this,e)).refreshInputs=n.refreshInputs.bind(Object(o.a)(n)),n.handleInputChanges=n.handleInputChanges.bind(Object(o.a)(n)),n.inputDialog=n.inputDialog.bind(Object(o.a)(n)),n.hideInputDialog=n.hideInputDialog.bind(Object(o.a)(n)),n.saveInputChanges=n.saveInputChanges.bind(Object(o.a)(n)),n.deleteInput=n.deleteInput.bind(Object(o.a)(n)),n.saveChanges=n.saveChanges.bind(Object(o.a)(n)),n.handleSnackbarClose=n.handleSnackbarClose.bind(Object(o.a)(n)),n.state={inputs:[],errors:{},input:{uuid:"",inputDisplayMode:"",inputType:"",inputName:"",exportData:!0,diskSize:0,enableSSL:!1,sslMode:"prefer"},editInputDialog:!1,missingInput:!1,newInputKey:0,saveButtonDisabled:!0,showSnackbar:!1},n}return Object(c.a)(a,[{key:"componentDidMount",value:function(){var e=Object(l.a)(s.a.mark((function e(){return s.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:this.refreshInputs();case 1:case"end":return e.stop()}}),e,this)})));return function(){return e.apply(this,arguments)}}()},{key:"refreshInputs",value:function(){var e=Object(l.a)(s.a.mark((function e(){var t,a;return s.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,e.next=3,fetch("".concat(this.context.apiUrl,"/input"),{credentials:"include"});case 3:return t=e.sent,e.next=6,t.json();case 6:a=e.sent,this.setState({inputs:a.inputs}),e.next=13;break;case 10:e.prev=10,e.t0=e.catch(0),console.log("CATCH ERR",e.t0);case 13:case"end":return e.stop()}}),e,this,[[0,10]])})));return function(){return e.apply(this,arguments)}}()},{key:"handleInputChanges",value:function(e){var t=this.state;t.input[e.target.name]="enableSSL"===e.target.name||"exportData"===e.target.name?e.target.checked:e.target.value,this.setState(t)}},{key:"inputDialog",value:function(e){e?this.setState({input:{uuid:e.uuid,inputDisplayMode:"Edit",inputType:e.inputType,inputName:e.inputName,exportData:e.exportData,diskSize:e.diskSize,enableSSL:e.enableSSL,sslMode:e.sslMode},editInputDialog:!0}):this.setState({input:{uuid:"new",inputDisplayMode:"Add",inputType:"",inputName:"",exportData:!0,diskSize:20,enableSSL:!1,sslMode:"prefer"},editInputDialog:!0})}},{key:"hideInputDialog",value:function(){this.setState({editInputDialog:!1})}},{key:"handleSnackbarClose",value:function(){this.setState({showSnackbar:!1})}},{key:"editInputDialogContent",value:function(){var e=this;return b.a.createElement(w.a,null,b.a.createElement(w.a,{mt:4},this.state.errors.JSX,b.a.createElement(w.a,{mt:4},b.a.createElement(ce,{fullWidth:!0},b.a.createElement(oe,{error:this.state.errors.inputName,name:"inputName",label:"Input Name",value:this.state.input.inputName,onChange:function(t){return e.handleInputChanges(t)},InputProps:{endAdornment:b.a.createElement(O.a,{className:this.props.classes.selectAdornment,position:"end"},b.a.createElement(x.a,{title:"Arbitrary label for this input",placement:"right-start"},b.a.createElement(Y.a,null)))}})),b.a.createElement(w.a,{mt:4},b.a.createElement(ce,{fullWidth:!0},b.a.createElement(T.a,{htmlFor:"inputType"},"Input/Database Type"),b.a.createElement(L.a,{error:this.state.errors.inputType,name:"inputType",value:this.state.input.inputType,onChange:function(t){return e.handleInputChanges(t)}},b.a.createElement(N.a,{key:"postgresql",value:"postgresql"},"PostgreSQL")))),b.a.createElement(w.a,{mt:4},b.a.createElement(z.a,{control:b.a.createElement(M.a,{checked:this.state.input.exportData,onChange:function(t){return e.handleInputChanges(t)},name:"exportData",color:"primary"}),label:"Export data from this input source"}),"\xa0",b.a.createElement(x.a,{title:"Checking this option means that you intend to export data from this input source, in which case temporary disk space will be required for this export (CSV) data",placement:"right-start"},b.a.createElement(Y.a,null))),b.a.createElement(w.a,{mt:4,display:this.state.input.exportData?"block":"none"},b.a.createElement(ce,{fullWidth:!0,variant:"outlined"},b.a.createElement(oe,{error:this.state.errors.diskSize,name:"diskSize",label:"Disk Space Allocation",onChange:function(t){return e.handleInputChanges(t)},value:this.state.input.diskSize,type:"number",InputProps:{endAdornment:b.a.createElement(O.a,{className:this.props.classes.selectAdornment,position:"end"},b.a.createElement("b",null,"GB"),"\xa0\xa0",b.a.createElement(x.a,{title:"Specify an adequate amount of disk space to allocate for this export (CSV) data. A persistent volume claim will be provisioned matching this file size. You can enlarge, but not shrink this disk space in the future.",placement:"right-start"},b.a.createElement(Y.a,null))),inputProps:{min:1}}}))),b.a.createElement(w.a,{mt:4},b.a.createElement(z.a,{control:b.a.createElement(M.a,{checked:this.state.input.enableSSL,onChange:function(t){return e.handleInputChanges(t)},name:"enableSSL",color:"primary"}),label:"Database Connectivity Should Be TLS/SSL Encrypted"})),b.a.createElement(w.a,{mt:4,display:this.state.input.enableSSL?"block":"none"},'Be sure to follow the "TLS/SSL Certificate Setup Instructions" included in the Agents page to facilitate connectivity using your certificates.',b.a.createElement(w.a,{mt:4},b.a.createElement(ce,{fullWidth:!0},b.a.createElement(T.a,{htmlFor:"sslMode"},"TLS/SSL Mode"),b.a.createElement(L.a,{name:"sslMode",value:this.state.input.sslMode,onChange:function(t){return e.handleInputChanges(t)}},b.a.createElement(N.a,{key:"allow",value:"allow"},"Allow"),b.a.createElement(N.a,{key:"prefer",value:"prefer"},"Prefer"),b.a.createElement(N.a,{key:"require",value:"require"},"Require"),b.a.createElement(N.a,{key:"verify-ca",value:"verify-ca"},"Verify CA"),b.a.createElement(N.a,{key:"verify-full",value:"verify-full"},"Verify Full"))))))))}},{key:"saveInputChanges",value:function(){var e=this.state,t=!1,a=this.state.inputs;if(e.input.inputName?e.errors.inputName=!1:(e.errors.inputName=!0,t=!0),e.input.inputType?e.errors.inputType=!1:(e.errors.inputType=!0,t=!0),t)this.setState({errors:e.errors});else{"new"===this.state.input.uuid&&(e.newInputKey++,e.input.uuid="new"+e.newInputKey,a.push(e.input));var n=!1;if(a=a.map((function(t){return t.inputName===e.input.inputName&&t.uuid!==e.input.uuid?n=!0:t.uuid===e.input.uuid&&(t.inputName=e.input.inputName,t.inputType=e.input.inputType,t.diskSize=e.input.diskSize,t.enableSSL=e.input.enableSSL,t.sslMode=e.input.sslMode),t})),n)return e.errors.JSX=b.a.createElement(de,{mb:4,severity:"error"},"Input names must be unique."),void this.setState({errors:e.errors});e.errors.JSX=null,this.state.input.uuid.match(/^new/)?this.setState({missingInput:!1,errors:e.errors,editInputDialog:!1,newInputKey:e.newInputKey,inputs:a,saveButtonDisabled:!1}):this.setState({missingInput:!1,errors:e.errors,editInputDialog:!1,inputs:a,saveButtonDisabled:!1})}}},{key:"deleteInput",value:function(e){var t=this.state.inputs.filter((function(t){return t.uuid!==e.uuid}));this.setState({inputs:t,saveButtonDisabled:!1})}},{key:"saveChanges",value:function(){var e=Object(l.a)(s.a.mark((function e(){var t;return s.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,this.setState({saveButtonDisabled:!0,errors:{}}),t={inputs:this.state.inputs},e.next=5,fetch("".concat(this.context.apiUrl,"/input"),{method:"put",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(t)});case 5:this.setState({saveButtonDisabled:!1,showSnackbar:!0}),this.refreshInputs(),e.next=13;break;case 9:e.prev=9,e.t0=e.catch(0),console.log("CATCH ERR",e.t0),this.setState({saveButtonDisabled:!1});case 13:case"end":return e.stop()}}),e,this,[[0,9]])})));return function(){return e.apply(this,arguments)}}()},{key:"render",value:function(){var e=this;return b.a.createElement(b.a.Fragment,null,b.a.createElement(g.a,{title:"Input Sources"}),b.a.createElement(A.a,{variant:"h1",gutterBottom:!0,display:"inline"},"Input Sources"),b.a.createElement(re,{my:6}),b.a.createElement(w.a,{mt:4},b.a.createElement(A.a,{variant:"body1",gutterBottom:!0},"Define your input sources (i.e. databases, API inputs, etc.) here."),b.a.createElement(w.a,{mt:8},b.a.createElement(B.a,{justify:"space-between",container:!0,spacing:10},b.a.createElement(B.a,{item:!0}),b.a.createElement(B.a,{item:!0},b.a.createElement("div",null,b.a.createElement(se,{variant:"contained",color:"secondary",size:"small",onClick:function(){return e.inputDialog()}},b.a.createElement(Q.a,null),"\xa0 Add Input Source"))))),b.a.createElement(ie,{mt:8},b.a.createElement(q.a,null,b.a.createElement(P.a,null,b.a.createElement(R.a,null,b.a.createElement(H.a,null,b.a.createElement(j.a,null,"ID"),b.a.createElement(j.a,null,"Name"),b.a.createElement(j.a,null,"Input Type"),b.a.createElement(j.a,null,"Disk Space Allocation"),b.a.createElement(j.a,null,"TLS/SSL Encrypted"),b.a.createElement(j.a,null))),b.a.createElement(J.a,null,this.state.inputs.map((function(t){return b.a.createElement(H.a,{key:t.uuid},b.a.createElement(j.a,null,t.uuid.match(/^new/)?"":t.uuid),b.a.createElement(j.a,null,t.inputName),b.a.createElement(j.a,null,t.inputType),b.a.createElement(j.a,null,t.diskSize?t.diskSize+" GB":"None"),b.a.createElement(j.a,null,t.enableSSL?"yes":"no"),b.a.createElement(pe,null,b.a.createElement(se,{variant:"contained",color:"secondary",size:"small",onClick:function(){return e.inputDialog(t)}},b.a.createElement(Z.a,null),"\xa0Edit"),"\xa0",b.a.createElement(se,{variant:"contained",color:"default",size:"small",onClick:function(){return e.deleteInput(t)}},b.a.createElement($.a,null),"\xa0Delete")))})))),b.a.createElement(w.a,{mt:8},b.a.createElement(B.a,{container:!0,justify:"space-between"},b.a.createElement(B.a,{item:!0,xs:10},b.a.createElement(se,{variant:"contained",color:"primary",size:"large",disabled:this.state.saveButtonDisabled,onClick:function(){return e.saveChanges()}},b.a.createElement(ee.a,null),"\xa0 Save Changes"))))))),b.a.createElement(W.a,{open:this.state.editInputDialog,onClose:this.hideInputDialog,maxWidth:"md","aria-labelledby":"dialog-title","aria-describedby":"dialog-description",fullWidth:!0},b.a.createElement(G.a,{id:"dialog-title"},this.state.input.inputDisplayMode," Input Source"),b.a.createElement(K.a,null,b.a.createElement(V.a,{id:"dialog-description"},this.editInputDialogContent()),b.a.createElement(F.a,null,b.a.createElement(se,{color:"secondary",variant:"contained",onClick:this.saveInputChanges},this.state.input.inputDisplayMode," Input")))),b.a.createElement(X.a,{anchorOrigin:{vertical:"top",horizontal:"right"},open:this.state.showSnackbar,autoHideDuration:8e3,onClose:this.handleSnackbarClose,ContentProps:{"aria-describedby":"message-id"},message:b.a.createElement("span",{id:"message-id"},b.a.createElement("b",null,"Your changes have been saved!")),action:[b.a.createElement(U.a,{key:"close","aria-label":"Close",color:"inherit",onClick:this.handleSnackbarClose},b.a.createElement(_.a,null))]}))}}]),a}(b.a.Component);me.contextType=ne.a,t.default=Object(f.a)({selectAdornment:{marginRight:"-30px"}})(me)}}]);
//# sourceMappingURL=11.a3c8e114.chunk.js.map