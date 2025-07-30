import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ProductDetailPage() {
  const { query } = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.itemId || !query.productSlug) return;

    async function fetchProduct() {
      try {
        const res = await fetch(`/${query.itemId.toLowerCase()}_products.json`);
        if (!res.ok) throw new Error("JSON取得失敗");

        const data = await res.json();
        const found = data.find(
          (item) => item.slug === query.productSlug
        );

        setProduct(found || null);
      } catch (error) {
        console.error("詳細データ取得失敗:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [query.itemId, query.productSlug]);

  if (loading) return <p>読み込み中...</p>;
  if (!product) return <p>商品が見つかりません</p>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>{product.price}</p>
    </div>
  );
}
