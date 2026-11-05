import { Redirect } from "@/components/Redirect";
import { movedMeta } from "@/i18n/meta";

// An earlier name or address of the deal product, which is now iSale, at /isale/.
export const metadata = movedMeta("en", "isale", "iSale · INOVI Group");
export default function Moved() { return <Redirect to="/isale/" label="iSale" />; }
