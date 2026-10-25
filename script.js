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
function addToCart(id){const found=cart.find(i=>i.id===id);if(found)found.qty++;else cart.push({id,qty:1});renderCart();showToast("اتضاف المنتج للسلة")}
function total(){return cart.reduce((s,i)=>s+products.find(p=>String(p.id)===String(i.id)).price*i.qty,0)}
function renderCart(){
  $("#cartCount").textContent=cart.reduce((s,i)=>s+i.qty,0);$("#cartTotal").textContent=money(total());$("#checkoutTotal").textContent=money(total());
  $("#cartItems").innerHTML=cart.length?cart.map(i=>{const p=products.find(p=>String(p.id)===String(i.id));return `<div class="cart-item"><div><h3>${p.name}</h3><p>${money(p.price)} للقطعة</p><div class="quantity"><button data-change="${p.id}" data-delta="-1" aria-label="تقليل">−</button><span>${i.qty}</span><button data-change="${p.id}" data-delta="1" aria-label="زيادة">+</button></div></div><strong>${money(p.price*i.qty)}</strong></div>`}).join(""):'<div class="empty-cart">السلة لسه فاضية 🌿<br>اختاري المنتجات اللي محتاجاها.</div>';
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
$("#checkoutForm").addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());$("#checkoutDialog").close();openCart();const msg=orderText(d);const result=window.confirm("تم تجهيز ملخص الطلب على جهازك. هل تريدين إرساله على واتساب؟\n\nاضغطي موافق لفتح واتساب، أو إلغاء للرجوع للمتجر.");if(result){if(!WHATSAPP_NUMBER)showToast("البيانات لم تُرسل. أضيفي رقم واتساب في script.js");else window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank","noopener")}else{showToast("تنبيه: الطلب لم يُحفظ على الإنترنت في النسخة التجريبية")}});
$("#year").textContent=new Date().getFullYear();
loadProducts();renderCart();
