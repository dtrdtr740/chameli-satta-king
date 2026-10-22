import { ContentPage, contentMetadata } from '@/components/site/ContentPage';

const def = { pageKey: 'terms-conditions', path: '/terms-conditions', title: 'Terms & Conditions' };

export const generateMetadata = () => contentMetadata(def);

export default function Page() {
  return <ContentPage {...def} />;
}
