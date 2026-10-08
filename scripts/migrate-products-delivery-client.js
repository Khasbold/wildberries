/**
 * Client-side migration: Run this in the browser console after the app loads.
 *
 * Paste this into browser DevTools console when the app is running:
 *
 * It will update all products in Firestore with:
 * - productType: randomly 'ready' (~60%) or 'order' (~40%)
 * - deliveryFree: false
 * - deliveryPrice: random 6000-8000
 * - orderDays: 7-14 for 'order', 0 for 'ready'
 */

// This code should be pasted into browser console:
/*
(async () => {
  const { collection, getDocs, updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js');
  // Use the already-initialized Firestore instance
  const db = window.__firestore_db; // We'll expose this

  const snapshot = await getDocs(collection(db, 'products'));
  let count = 0;
  for (const d of snapshot.docs) {
    const data = d.data();
    if (data.productType) { console.log('Skip:', d.id); continue; }
    const isOrder = Math.random() < 0.4;
    const deliveryPrice = (Math.floor(Math.random() * 3) + 6) * 1000;
    const orderDays = isOrder ? Math.floor(Math.random() * 8) + 7 : 0;
    await updateDoc(doc(db, 'products', d.id), {
      productType: isOrder ? 'order' : 'ready',
      deliveryFree: false,
      deliveryPrice,
      orderDays,
    });
    console.log(`Updated ${d.id} (${data.title}): ${isOrder ? 'order' : 'ready'}, ${deliveryPrice}₮`);
    count++;
  }
  console.log(`Done! Updated ${count} products.`);
})();
*/
