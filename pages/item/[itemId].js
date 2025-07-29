import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function AgentItemPage() {
  const { query } = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.itemId) return;

    async function fetchProducts() {
      try {
        const res = await fetch("/kk_products.json");
        const data = await res.json();

        const agentId = query.itemId.toLowerCase();
        const agentProducts = data[agentId] || [];

        setProducts(agentProducts);
      } catch (error) {
        console.error("商品データの取得に失敗しました:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [query.itemId]);

  return (
    <div>
      <h1>代理店: {query.itemId}</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : products.length > 0 ? (
        <ul>
          {products.map((item, index) => (
            <li key={index}>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>該当する商品がありません</p>
      )}
    </div>
  );
}
