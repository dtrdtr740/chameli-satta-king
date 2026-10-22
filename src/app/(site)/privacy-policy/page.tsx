import { ContentPage, contentMetadata } from '@/components/site/ContentPage';

const def = { pageKey: 'privacy-policy', path: '/privacy-policy', title: 'Privacy Policy' };

export const generateMetadata = () => contentMetadata(def);

export default function Page() {
  return <ContentPage {...def} />;
}
