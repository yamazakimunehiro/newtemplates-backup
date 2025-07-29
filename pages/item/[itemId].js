// ファイル場所: pages/item/[itemId].js

import { createClient, OAuthStrategy } from '@wix/sdk';
import { products, collections } from '@wix/stores';
import { CLIENT_ID } from '@/constants/constants';
import Head from 'next/head';

const wixClient = createClient({
  modules: { products, collections },
  siteId: process.env.WIX_SITE_ID,
  auth: OAuthStrategy({
    clientId: CLIENT_ID,
    tokens: { accessToken: '', refreshToken: '' }, // 公開データ取得のみであれば空でOK
  }),
});

export async function getStaticPaths() {
  // 任意でプレビルド用のpathを定義、または fallback を true にする
  return {
    paths: [],
    fallback: 'blocking',
  };
}

export async function getStaticProps({ params }) {
  const targetCollectionName = params.itemId.toUpperCase();

  // すべてのコレクションを取得
  const collectionRes = await wixClient.collections.queryCollections().find();
  const targetCollection = collectionRes.items.find(
    (c) => c.name.toUpperCase() === targetCollectionName
  );

  if (!targetCollection) {
    return { notFound: true };
  }

  // コレクションIDに属する商品を取得
  const result = await wixClient.products
    .queryProducts()
    .withFilters({ collectionId: targetCollection._id })
    .find();

  return {
    props: {
      products: result.items,
      agentId: targetCollectionName,
    },
    revalidate: 60, // ISRを有効にする場合（1分ごとに更新）
  };
}

export default function AgentProductsPage({ products, agentId }) {
  return (
    <>
      <Head>
        <title>代理店: {agentId}</title>
      </Head>
      <main>
        <h1>代理店: {agentId}</h1>
        {products.length === 0 ? (
          <p>該当商品がありません</p>
        ) : (
          <ul>
            {products.map((product) => (
              <li key={product._id}>{product.name}</li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
