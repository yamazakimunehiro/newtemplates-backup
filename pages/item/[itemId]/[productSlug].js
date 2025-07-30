import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

// 定数（環境変数と合わせてください）
const CLIENT_ID = "your-client-id"; // 既存の CLIENT_ID に合わせて書き換えてください

const myWixClient = createClient({
  modules: { products, currentCart, redirects },
  siteId: process.env.NEXT_PUBLIC_WIX_SITE_ID, // .env で定義してください
  auth: OAuthStrategy({
    clientId: CLIENT_ID,
    tokens: JSON.parse(Cookies.get("session") || null),
  }),
});

export default function ProductDetailPage() {
  const { query } = useRouter();
  const [product, setProduct] = useState(null);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.itemId || !query.productSlug) return;

    async function fetchProduct() {
      try {
        const res = await fetch(`/${query.itemId.toLowerCase()}_products.json`);
        if (!res.ok) throw new Error("JSON取得失敗");

        const data = await res.json();
        const found = data.find((item) => item.slug === query.productSlug);
        setProduct(found || null);
      } catch (error) {
        console.error("商品取得エラー:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    async function fetchCart() {
      try {
        const cartData = await myWixClient.currentCart.getCurrentCart();
        setCart(cartData);
      } catch (error) {
        console.error("カート取得失敗:", error);
      }
    }

    fetchProduct();
    fetchCart();
  }, [query.itemId, query.productSlug]);

  const addToCart = async () => {
    if (!product || !product.wixProductId) return;

    try {
      const { cart: updatedCart } = await myWixClient.currentCart.addToCurrentCart({
        lineItems: [
          {
            catalogReference: {
              appId: "1380b703-ce81-ff05-f115-39571d94dfcd", // 固定ID（Wix Stores App）
              catalogItemId: product.wixProductId,
            },
            quantity: 1,
          },
        ],
      });

      setCart(updatedCart);
    } catch (error) {
      console.error("カート追加失敗:", error);
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
    } catch (error) {
      console.error("チェックアウトエラー:", error);
    }
  };

  const clearCart = async () => {
    try {
      await myWixClient.currentCart.deleteCurrentCart();
      setCart({});
    } catch (error) {
      console.error("カートクリア失敗:", error);
    }
  };

  if (loading) return <p>読み込み中...</p>;
  if (!product) return <p>商品が見つかりません</p>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>{product.price}</p>
      <button onClick={addToCart}>カートに追加</button>

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
