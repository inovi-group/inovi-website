import { baseMetadata, baseViewport, RootShell } from "@/components/RootShell";

export const metadata = baseMetadata;
export const viewport = baseViewport;

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="en">{children}</RootShell>;
}
