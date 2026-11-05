import { baseMetadata, baseViewport, RootShell } from "@/components/RootShell";

export const metadata = baseMetadata;
export const viewport = baseViewport;

export default function FrenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="fr">{children}</RootShell>;
}
