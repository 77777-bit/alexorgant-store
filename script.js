// Alexorgant Cosmetics - starter storefront
// Replace the demo products and WhatsApp number below before launch.
const WHATSAPP_NUMBER = ""; // ضع رقم واتساب المتجر بصيغة 2010xxxxxxxx بدون + أو مسافات
const SUPABASE_URL = "https://nzckjiqygjxaguxvgzwo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4azFT8K7YjPnGG8s5LIzBw_pPWzAdZj";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let products = [];
const demoProducts = [
  {id:"demo-1",name:"Daily Glow Cleanser",category:"العناية بالبشرة",description:"غسول يومي — منتج تجريبي",price:180,kind:"bottle",tag:"الأكثر طلبًا"},
  {id:"demo-2",name:"Soft Touch Body Lotion",category:"العناية بالجسم",description:"لوشن للجسم — منتج تجريبي",price:220,kind:"bottle",tag:""},
  {id:"demo-3",name:"Hydra Care Cream",category:"العناية بالبشرة",description:"كريم ترطيب — منتج تجريبي",price:250,kind:"jar",tag:""},
  {id:"demo-4",name:"Silky Body Butter",category:"العناية بالجسم",description:"زبدة جسم — منتج تجريبي",price:290,kind:"jar",tag:"جديد"}
];
let cart = [];
let deliveryZones = [];
const $ = (s)=>document.querySelector(s);
const money = (n)=>`${n.toLocaleString("en-US")} ج.م`;
function showToast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function renderProducts(filter=""){
  const grid=$("#productGrid");
  const list=products.filter(p=>(p.name+" "+p.category+" "+p.description).toLowerCase().includes(filter.toLowerCase()));
  grid.innerHTML=list.map(p=>`<article class="product-card"><div class="product-photo">${p.tag?`<span class="badge-label">${p.tag}</span>`:""}${p.image_url?`<img src="${p.image_url}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:`<div class="${p.kind||'bottle'}"></div>`}</div><div class="product-info"><h3>${p.name}</h3><p>${p.description||""}</p><div class="product-meta"><span class="price">${money(Number(p.price))}</span><button class="add-btn" data-add="${p.id}">+ أضيفي للسلة</button></div></div></article>`).join("")||'<p>لسه مفيش منتجات منشورة. أضيفي منتجاتك من لوحة الإدارة بعد تجهيزها.</p>';
  grid.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
}
async function loadProducts(){
  const grid=$("#productGrid");
  grid.innerHTML='<p>جاري تحميل المنتجات...</p>';
  const {data,error}=await supabaseClient.from("products").select("id,name,description,price,image_url,category,stock_quantity,is_active").eq("is_active",true).order("created_at",{ascending:false});
  if(error){console.error("Supabase products error:",error);products=demoProducts;renderProducts($("#searchInput").value);showToast("تعذر تحميل المنتجات من قاعدة البيانات؛ المعروض تجريبي");return;}
  products=(data||[]).map(p=>({...p,price:Number(p.price),tag:"",kind:"bottle"}));
  renderProducts($("#searchInput").value);
}
function addToCart(id){const p=products.find(p=>String(p.id)===String(id));if(!p)return;const found=cart.find(i=>i.id===id);if(found){if(found.qty>=Number(p.stock_quantity||0))return showToast("الكمية المتاحة خلصت");found.qty++;}else{if(Number(p.stock_quantity||0)<1)return showToast("المنتج غير متاح حاليًا");cart.push({id,qty:1});}renderCart();showToast("اتضاف المنتج للسلة")}
function total(){return cart.reduce((s,i)=>{const p=products.find(p=>String(p.id)===String(i.id));return s+(p?p.price*i.qty:0)},0)}
async function loadDeliveryZones(){
 const select=$("#deliveryZone");
 const {data,error}=await supabaseClient.from("delivery_zones").select("zone_name,fee").eq("is_active",true).order("fee");
 if(error){console.error("Delivery zones error:",error);select.innerHTML='<option value="">تعذر تحميل مناطق التوصيل</option>';return;}
 deliveryZones=data||[];
 select.innerHTML='<option value="">اختاري المحافظة أو المنطقة</option>'+deliveryZones.map(z=>`<option value="${z.zone_name}">${z.zone_name} — ${money(Number(z.fee))}</option>`).join("");
 updateCheckoutEstimate();
}
function updateCheckoutEstimate(){
 const subtotal=total(); const zone=deliveryZones.find(z=>z.zone_name===$("#deliveryZone").value);
 $("#checkoutSubtotal").textContent=money(subtotal);
 $("#checkoutDiscount").textContent="يُحسب عند التأكيد";
 $("#checkoutDelivery").textContent=subtotal>=500?"مجاني":(zone?money(Number(zone.fee)):"اختاري المنطقة");
 $("#checkoutTotal").textContent=money(subtotal+(subtotal>=500?0:(zone?Number(zone.fee):0)));
}
function renderCart(){
  $("#cartCount").textContent=cart.reduce((s,i)=>s+i.qty,0);$("#cartTotal").textContent=money(total());updateCheckoutEstimate();
  $("#cartItems").innerHTML=cart.length?cart.map(i=>{const p=products.find(p=>String(p.id)===String(i.id));if(!p)return "";return `<div class="cart-item"><div><h3>${p.name}</h3><p>${money(p.price)} للقطعة</p><div class="quantity"><button data-change="${p.id}" data-delta="-1" aria-label="تقليل">−</button><span>${i.qty}</span><button data-change="${p.id}" data-delta="1" aria-label="زيادة">+</button></div></div><strong>${money(p.price*i.qty)}</strong></div>`}).join(""):'<div class="empty-cart">السلة لسه فاضية 🌿<br>اختاري المنتجات اللي محتاجاها.</div>';
  $("#cartItems").querySelectorAll("[data-change]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.change,delta=Number(b.dataset.delta),item=cart.find(i=>String(i.id)===String(id));item.qty+=delta;if(item.qty<=0)cart=cart.filter(i=>String(i.id)!==String(id));renderCart()}));
}
function openCart(){$("#cartDrawer").classList.add("open");$("#cartBackdrop").classList.add("show");$("#cartDrawer").setAttribute("aria-hidden","false")}
function closeCart(){$("#cartDrawer").classList.remove("open");$("#cartBackdrop").classList.remove("show");$("#cartDrawer").setAttribute("aria-hidden","true")}
function orderText(details=null){
  const lines=cart.map(i=>{const p=products.find(p=>String(p.id)===String(i.id));return `- ${p.name} × ${i.qty} = ${money(p.price*i.qty)}`});
  let s="طلب جديد من Alexorgant Cosmetics\n\n"+lines.join("\n")+"\n\nالإجمالي: "+money(total());
  if(details)s+="\n\nالاسم: "+details.name+"\nالموبايل: "+details.phone+"\nالعنوان: "+details.address+(details.notes?"\nملاحظات: "+details.notes:"");
  return s;
}
$("#themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");const dark=document.body.classList.contains("dark");localStorage.setItem("alexorgant-theme",dark?"dark":"light");$("#themeToggle").textContent=dark?"☀":"☾"});
if(localStorage.getItem("alexorgant-theme")==="dark"){document.body.classList.add("dark");$("#themeToggle").textContent="☀"}
$("#cartOpen").addEventListener("click",openCart);$("#cartClose").addEventListener("click",closeCart);$("#cartBackdrop").addEventListener("click",closeCart);
$("#searchInput").addEventListener("input",e=>renderProducts(e.target.value));
$("#whatsappOrder").addEventListener("click",()=>{if(!cart.length)return showToast("ضيفي منتج للسلة الأول");if(!WHATSAPP_NUMBER)return showToast("أضيفي رقم واتساب المتجر في ملف script.js أولًا");window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText())}`,"_blank","noopener")});
$("#checkoutOpen").addEventListener("click",()=>{if(!cart.length)return showToast("ضيفي منتج للسلة الأول");$("#checkoutDialog").showModal()});
$("#checkoutClose").addEventListener("click",()=>$("#checkoutDialog").close());
$("#deliveryZone").addEventListener("change",updateCheckoutEstimate);
const paymentInstructions = $("#paymentInstructions");
const paymentProof = $("#paymentProof");
function selectedPaymentMethod(){return new FormData($("#checkoutForm")).get("payment_method")||"cod";}
function updatePaymentControls(){
 const method=selectedPaymentMethod();
 paymentInstructions.hidden=method==="cod";
 paymentProof.required=method!=="cod";
 $("#checkoutSubmit").textContent=method==="cod"?"تأكيد الطلب — الدفع عند الاستلام":"تأكيد الطلب ورفع إثبات التحويل";
}
document.querySelectorAll('input[name="payment_method"]').forEach(r=>r.addEventListener("change",updatePaymentControls));
updatePaymentControls();

$("#checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return showToast("السلة فاضية");
 const d=Object.fromEntries(new FormData(e.currentTarget).entries());
 if(!d.delivery_zone)return showToast("اختاري منطقة التوصيل");
 const method=d.payment_method||"cod";const proof=paymentProof.files?.[0]||null;
 if(method!=="cod"&&!proof)return showToast("ارفعي صورة إثبات التحويل الأول");
 if(proof&&(!["image/jpeg","image/png","image/webp"].includes(proof.type)||proof.size>5*1024*1024))return showToast("اختاري صورة JPG أو PNG أو WEBP أقل من 5 ميجابايت");
 const submit=$("#checkoutSubmit");submit.disabled=true;submit.textContent="جاري حفظ الطلب...";
 try{
  const items=cart.map(i=>({product_id:i.id,quantity:i.qty}));
  const {data,error}=await supabaseClient.rpc("create_store_order",{p_customer_name:d.name,p_phone:d.phone,p_address:d.address,p_notes:d.notes||"",p_items:items,p_delivery_zone:d.delivery_zone,p_discount_code:d.discount_code.trim()||null});
  if(error)throw error;const order=Array.isArray(data)?data[0]:data;
  if(!order||!order.order_id||!order.order_number)throw new Error("لم يرجع النظام رقم الطلب");
  if(method!=="cod"){
   submit.textContent="جاري رفع إيصال التحويل...";
   const ext=proof.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
   const path=`${order.order_id}/${Date.now()}.${ext}`;
   const {error:uploadError}=await supabaseClient.storage.from("payment-proofs").upload(path,proof,{contentType:proof.type,upsert:false});
   if(uploadError)throw new Error("اتحفظ الطلب لكن رفع الإيصال فشل. تواصلي مع المتجر برقم الطلب "+order.order_number+". التفاصيل: "+uploadError.message);
   const {error:proofError}=await supabaseClient.rpc("submit_payment_proof",{p_order_id:order.order_id,p_order_number:order.order_number,p_payment_method:method,p_proof_path:path});
   if(proofError)throw new Error("اتحفظ الطلب وُرفع الإيصال لكن تسجيله فشل. احتفظي برقم الطلب "+order.order_number+" وتواصلي مع المتجر.");
  }
  cart=[];renderCart();$("#checkoutDialog").close();closeCart();
  showToast(method==="cod"?`تم حفظ طلبك. رقم الطلب: ${order.order_number} — الإجمالي ${money(Number(order.total))}`:`تم استلام الطلب والإيصال. رقم الطلب: ${order.order_number}. الدفع في انتظار مراجعة المتجر.`);
  e.currentTarget.reset();updatePaymentControls();updateCheckoutEstimate();
 }catch(err){console.error("Order save failed:",err);showToast(err.message||"تعذر حفظ الطلب. حاول مرة أخرى");}
 finally{submit.disabled=false;updatePaymentControls();}
});

// Anonymous customer support chat. Messages are validated by Supabase RPCs.
const CHAT_TOKEN_KEY = "alexorgant-chat-token";
const CHAT_ID_KEY = "alexorgant-chat-id";
let chatConversationId = localStorage.getItem(CHAT_ID_KEY) || "";
let chatToken = localStorage.getItem(CHAT_TOKEN_KEY) || "";
let chatPoll = null;
const chatStatus = (msg) => { const el = $("#chatStatus"); if (el) el.textContent = msg || ""; };
function setChatActive(active) {
  $("#chatIdentity").hidden = active;
  $("#chatMessages").hidden = !active;
  $("#chatSendForm").hidden = !active;
}
function safeChatText(value) { return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function startChat() {
  const name = $("#chatName").value.trim();
  const phone = $("#chatPhone").value.trim();
  if (!name) return chatStatus("اكتبي اسمك الأول.");
  const token = chatToken || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  chatStatus("جاري فتح المحادثة...");
  const {data,error} = await supabaseClient.rpc("customer_chat_open", {p_customer_name:name,p_phone:phone||null,p_token:token});
  if (error) { console.error(error); return chatStatus("تعذر فتح الشات. تأكدي إن ملف SQL الخاص بالشات اتنفّذ في Supabase."); }
  const result = Array.isArray(data) ? data[0] : data;
  chatConversationId = result?.conversation_id || result?.id || result?.conversation_id;
  if (!chatConversationId) return chatStatus("تعذر بدء المحادثة، جرّبي مرة تانية.");
  chatToken = token; localStorage.setItem(CHAT_TOKEN_KEY,token); localStorage.setItem(CHAT_ID_KEY,chatConversationId);
  setChatActive(true); chatStatus("المحادثة جاهزة."); await loadChatMessages();
  if (chatPoll) clearInterval(chatPoll); chatPoll = setInterval(loadChatMessages,5000);
}
async function loadChatMessages() {
  if (!chatConversationId || !chatToken) return;
  const {data,error}=await supabaseClient.rpc("customer_chat_messages",{p_conversation_id:chatConversationId,p_token:chatToken});
  if(error){console.error(error);chatStatus("حصلت مشكلة في تحديث الرسائل.");return;}
  const list=Array.isArray(data)?data:(data?.messages||[]);
  $("#chatMessages").innerHTML=list.map(m=>`<div class="chat-bubble ${m.sender_role==='admin'?'admin':'customer'}"><p>${safeChatText(m.message)}</p><time>${new Date(m.created_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</time></div>`).join("") || '<p class="chat-empty">أهلًا بيكي 🌿 اكتبي رسالتك وهنساعدك.</p>';
  $("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;
  chatStatus("");
}
async function sendChatMessage(event) {
  event.preventDefault(); const input=$("#chatMessageInput"); const message=input.value.trim();
  if(!message || !chatConversationId || !chatToken)return;
  const button=$("#chatSendForm button");button.disabled=true;
  const {error}=await supabaseClient.rpc("customer_chat_send",{p_conversation_id:chatConversationId,p_token:chatToken,p_message:message});
  button.disabled=false;
  if(error){console.error(error);chatStatus("الرسالة ما اتبعتتش. حاولي تاني.");return;}
  input.value="";await loadChatMessages();
}
$("#chatToggle").addEventListener("click",()=>{const panel=$("#chatPanel");const open=panel.hidden;panel.hidden=!open;$("#chatToggle").setAttribute("aria-expanded",String(open));if(open&&chatConversationId&&chatToken){setChatActive(true);loadChatMessages();if(chatPoll)clearInterval(chatPoll);chatPoll=setInterval(loadChatMessages,5000);}});
$("#chatClose").addEventListener("click",()=>{$("#chatPanel").hidden=true;$("#chatToggle").setAttribute("aria-expanded","false");if(chatPoll){clearInterval(chatPoll);chatPoll=null;}});
$("#chatStart").addEventListener("click",startChat);
$("#chatSendForm").addEventListener("submit",sendChatMessage);
if(chatConversationId && chatToken){setChatActive(true);}

$("#year").textContent=new Date().getFullYear();
loadProducts();loadDeliveryZones();renderCart();
