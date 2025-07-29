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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.itemId) return;

    async function fetchFiltered() {
      try {
        setLoading(true);

        const targetCollectionId = query.itemId.toUpperCase(); // コレクションID（大文字で）

        const result = await wixClient.products
          .queryProducts()
          .hasSome("collectionIds", [targetCollectionId])
          .find();

        setFilteredProducts(result.items);
      } catch (err) {
        console.error("商品取得失敗", err);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFiltered();
  }, [query.itemId]);

  return (
    <div>
      <h1>代理店: {query.itemId}</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : filteredProducts.length > 0 ? (
        <ul>
          {filteredProducts.map((product) => (
            <li key={product._id}>
              {product.name}（SKU: {product.sku}）
            </li>
          ))}
        </ul>
      ) : (
        <p>該当商品がありません</p>
      )}
    </div>
  );
}
