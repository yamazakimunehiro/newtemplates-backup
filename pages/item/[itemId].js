import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";

const wixClient = createClient({
  modules: { products },
  siteId: process.env.WIX_SITE_ID,
  auth: OAuthStrategy({
    clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID,
    tokens: { refreshToken: "", accessToken: { value: "", expiresAt: 0 } },
  }),
});

export default function AgentItemPage() {
  const { query } = useRouter();
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    if (!query.itemId) return;

    async function fetchFiltered() {
      try {
        const result = await wixClient.products.queryProducts().find();
        const items = result.items.filter((p) =>
          p.name?.trim().toLowerCase().endsWith(`-${query.itemId.toLowerCase()}`)
        );
        setFilteredProducts(items);
      } catch (error) {
        console.error("商品取得に失敗しました:", error);
      }
    }

    fetchFiltered();
  }, [query.itemId]);

  return (
    <div>
      <h1>代理店: {query.itemId}</h1>
      <ul>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <li key={product._id}>{product.name}（SKU: {product.sku}）</li>
          ))
        ) : (
          <p>該当商品がありません</p>
        )}
      </ul>
    </div>
  );
}
