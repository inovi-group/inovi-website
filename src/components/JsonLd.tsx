export function JsonLd({ data }: { data: object }) {
  // "<" escaped so text in the data can never close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
