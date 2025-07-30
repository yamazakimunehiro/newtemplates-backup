import Cookies from "js-cookie";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { CLIENT_ID } from "@/constants/constants"; // すでに存在していればOK

export const myWixClient = createClient({
  modules: { products, currentCart, redirects },
  siteId: process.env.NEXT_PUBLIC_WIX_SITE_ID,
  auth: OAuthStrategy({
    clientId: CLIENT_ID,
    tokens: JSON.parse(Cookies.get("session") || null),
  }),
});
