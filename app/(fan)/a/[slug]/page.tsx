import type { Metadata } from "next";
import { DetailView } from "@/components/activation/detail-view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return { title };
}

export default async function ActivationPage({ params }: Props) {
  const { slug } = await params;
  return <DetailView slug={slug} />;
}
