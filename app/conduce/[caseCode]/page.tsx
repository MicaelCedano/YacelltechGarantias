import { redirect } from "next/navigation";

interface ConducePageProps {
  params: {
    caseCode: string;
  };
}

export default async function ConducePage({ params }: ConducePageProps) {
  redirect(`/conduce?cases=${params.caseCode.toUpperCase()}`);
}
