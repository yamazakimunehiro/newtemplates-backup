import Cookies from "js-cookie";
import { useEffect, useState } from "react";

import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import testIds from "@/src/utils/test-ids";
import { CLIENT_ID } from "@/constants/constants";
import Link from "next/link";
import Head from "next/head";
import styles from "@/styles/app.module.css";
import { useAsyncHandler } from "@/src/hooks/async-handler";
import { useClient } from "@/internal/providers/client-provider";
import { useModal } from "@/internal/providers/modal-provider";

const myWixClient = createClient({
  modules: { products, currentCart, redirects },
  siteId: process.env.WIX_SITE_ID,
  auth: OAuthStrategy({
    clientId: CLIENT_ID,
    tokens: JSON.parse(Cookies.get("session") || null),
  }),
});

export default function Home() {
  const [productList, setProductList] = useState([]);
  const [cart, setCart] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const handleAsync = useAsyncHandler();
  const { msid } = useClient();
  const { openModal } = useModal();

  async function fetchProducts() {
    setIsLoading(true);
    try {
      await handleAsync(async () => {
        const productList = await myWixClient.products.queryProducts().find();
        setProductList(productList.items);
      });
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCart() {
    try {
      await handleAsync(async () =>
        setCart(await myWixClient.currentCart.getCurrentCart())
      );
    } catch {}
  }

  async function addToCart(product) {
    await handleAsync(async () => {
      const options = product.productOptions.reduce(
        (selected, option) => ({
          ...selected,
          [option.name]: option.choices[0].description,
        }),
        {}
      );

      if (cart) {
        const existingProduct = cart?.lineItems?.find(
          (item) => item.catalogReference.catalogItemId === product._id
        );
        if (existingProduct) {
          return addExistingProduct(
            existingProduct._id,
            existingProduct.quantity + 1
          );
        }
      }

      const { cart: returnedCard } =
        await myWixClient.currentCart.addToCurrentCart({
          lineItems: [
            {
              catalogReference: {
                appId: "1380b703-ce81-ff05-f115-39571d94dfcd",
                catalogItemId: product._id,
                options: { options },
              },
              quantity: 1,
            },
          ],
        });
      setCart(returnedCard);
    });
  }

  async function clearCart() {
    await handleAsync(async () => {
      await myWixClient.currentCart.deleteCurrentCart();
      setCart({});
    });
  }

  async function createRedirect() {
    try {
      await handleAsync(async () => {
        const { checkoutId } =
          await myWixClient.currentCart.createCheckoutFromCurrentCart({
            channelType: currentCart.ChannelType.WEB,
          });

        const redirect = await myWixClient.redirects.createRedirectSession({
          ecomCheckout: { checkoutId },
          callbacks: { postFlowUrl: window.location.href },
        });
        window.location = redirect.redirectSession.fullUrl;
      });
    } catch (error) {
      openModal("premium", {
        primaryAction: () => {
          window.open(
            `https://manage.wix.com/premium-purchase-plan/dynamo?siteGuid=${msid || ""}`,
            "_blank"
          );
        },
      });
    }
  }

  async function addExistingProduct(lineItemId, quantity) {
    const { cart } =
      await myWixClient.currentCart.updateCurrentCartLineItemQuantity([
        { _id: lineItemId, quantity },
      ]);
    setCart(cart);
  }

  useEffect(() => {
    fetchProducts();
    fetchCart();
  }, []);

  return (
    <>
      <Head>
        <title>Ecommerce Page</title>
      </Head>

      <main data-testid={testIds.COMMERCE_PAGE.CONTAINER}>
        <div>
          <h2>Choose Products:</h2>
          {isLoading ? (
            <p>Loading products...</p>
          ) : productList.length > 0 ? (
            productList.map((product) => (
              <section
                data-testid={testIds.COMMERCE_PAGE.PRODUCT}
                key={product._id}
                onClick={() => addToCart(product)}
                className={styles.selectable}
              >
                <span className={styles.fullWidth}>{product.name}</span>
                <span style={{ width: "100px", textAlign: "right" }}>
                  {product.convertedPriceData.formatted.discountedPrice}
                </span>
              </section>
            ))
          ) : (
            <div>
              <p>No products available</p>
              <Link
                href={`https://manage.wix.com/dashboard/${msid}/products`}
                rel="noopener noreferrer"
                target="_blank"
                style={{ textDecoration: "underline", color: "#0070f3" }}
              >
                Add a product
              </Link>
            </div>
          )}
        </div>
        <div>
          <h2>My Cart:</h2>
          {cart.lineItems?.length > 0 && (
            <div className={styles.column}>
              <section
                className={`${styles.column} ${styles.start} ${styles.active}`}
                style={{ gap: "24px", borderColor: "rgba(var(--card-border-rgb), 0.15)" }}
              >
                <li>
                  {cart.lineItems.map((item, index) => (
                    <ul key={index}>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <div style={{ fontWeight: "bold" }}>{item.quantity}</div>
                        <div className={styles.fullWidth}>{item.productName.original}</div>
                      </div>
                    </ul>
                  ))}
                </li>
                <h3>Total {cart.subtotal.formattedAmount}</h3>
              </section>
              <button
                className={styles.primary}
                onClick={() => createRedirect()}
                style={{ fontWeight: "bold" }}
                data-testid={testIds.COMMERCE_PAGE.CHECKOUT}
              >
                <div>Checkout</div>
              </button>
              <button onClick={() => clearCart()} className={styles.secondary}>
                <span>Clear cart</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
