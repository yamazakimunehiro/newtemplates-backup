import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

// 環境変数から取得することをおすすめ（直接書いてもOK）
const CLIENT_ID = "your-client-id"; // ← 実際のCLIENT_IDに置き換えてください

const myWixClient = createClient({
  modules: { products, currentCart, redirects },
  siteId: process.env.NEXT_PUBLIC_WIX_SITE_ID,
  auth: OAuthStrategy({
    clientId: CLIENT_ID,
    tokens: JSON.parse(Cookies.get("session") || null),
  }),
});

export default function ProductDetailPage() {
  const { query } = useRouter();
  const [product, setProduct] = useState(null);
  const [cart, setCart] = useState({});
  const [cartItemId, setCartItemId] = useState(null);
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.itemId || !query.productSlug) return;

    async function fetchData() {
      try {
        const res = await fetch(`/${query.itemId.toLowerCase()}_products.json`);
        if (!res.ok) throw new Error("商品JSON取得失敗");

        const data = await res.json();
        const found = data.find((item) => item.slug === query.productSlug);
        setProduct(found || null);
        const cartData = await myWixClient.currentCart.getCurrentCart();
        setCart(cartData);

        if (found) {
          const foundItem = cartData.lineItems?.find(
            (item) => item.catalogReference.catalogItemId === found.wixProductId
          );
          if (foundItem) {
            setQuantity(foundItem.quantity);
            setCartItemId(foundItem._id);
          }
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [query.itemId, query.productSlug]);

  const updateQuantity = async (newQty) => {
    if (!product || !product.wixProductId) return;
    if (newQty < 0) return;

    try {
      if (newQty === 0 && cartItemId) {
        await myWixClient.currentCart.removeLineItemFromCurrentCart(cartItemId);
        setQuantity(0);
        setCartItemId(null);
        const updatedCart = await myWixClient.currentCart.getCurrentCart();
        setCart(updatedCart);
        return;
      }

      if (cartItemId) {
        const { cart: updatedCart } =
          await myWixClient.currentCart.updateCurrentCartLineItemQuantity([
            { _id: cartItemId, quantity: newQty },
          ]);
        setQuantity(newQty);
        setCart(updatedCart);
      } else {
        const { cart: updatedCart } =
          await myWixClient.currentCart.addToCurrentCart({
            lineItems: [
              {
                catalogReference: {
                  appId: "1380b703-ce81-ff05-f115-39571d94dfcd",
                  catalogItemId: product.wixProductId,
                },
                quantity: 1,
              },
            ],
          });
        const addedItem = updatedCart.lineItems.find(
          (item) => item.catalogReference.catalogItemId === product.wixProductId
        );
        setCart(updatedCart);
        setQuantity(1);
        setCartItemId(addedItem?._id);
      }
    } catch (err) {
      console.error("数量変更失敗:", err);
    }
  };

  const checkout = async () => {
    try {
      const { checkoutId } =
        await myWixClient.currentCart.createCheckoutFromCurrentCart({
          channelType: currentCart.ChannelType.WEB,
        });

      const redirect = await myWixClient.redirects.createRedirectSession({
        ecomCheckout: { checkoutId },
        callbacks: { postFlowUrl: window.location.href },
      });

      window.location = redirect.redirectSession.fullUrl;
    } catch (err) {
      console.error("チェックアウト失敗:", err);
    }
  };

  const clearCart = async () => {
    try {
      await myWixClient.currentCart.deleteCurrentCart();
      setCart({});
      setCartItemId(null);
      setQuantity(0);
    } catch (err) {
      console.error("カートクリア失敗:", err);
    }
  };

  if (loading) return <p>読み込み中...</p>;
  if (!product) return <p>商品が見つかりません</p>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>{product.price}</p>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
        <button onClick={() => updateQuantity(quantity - 1)}>-</button>
        <span>{quantity} 個</span>
        <button onClick={() => updateQuantity(quantity + 1)}>+</button>
      </div>

      {cart.lineItems?.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h2>My Cart:</h2>
          <ul>
            {cart.lineItems.map((item, index) => (
              <li key={index}>
                {item.quantity} x {item.productName.original}
              </li>
            ))}
          </ul>
          <h3>Total: {cart.subtotal.formattedAmount}</h3>
          <button onClick={checkout}>Checkout</button>
          <button onClick={clearCart}>Clear Cart</button>
        </div>
      )}
    </div>
  );
}
