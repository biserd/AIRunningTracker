import { useParams } from "wouter";
import { ExternalLink } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/FAQSchema";
import { ArticleTrust } from "@/components/ArticleTrust";
import { getEditorialPost } from "@shared/editorialPosts";

export default function EditorialArticlePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const post = getEditorialPost(slug);
  if (!post) return <div className="min-h-screen bg-slate-50"><PublicHeader /><main className="mx-auto max-w-3xl px-4 py-20"><h1 className="text-3xl font-bold">Article not found</h1><p className="mt-3 text-slate-600">This article may have moved. Browse the running blog for current guides.</p><a href="/blog" className="mt-5 inline-block font-semibold text-blue-700">Browse the blog →</a></main><Footer /></div>;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "RunAnalytics Editorial Team" },
    publisher: { "@type": "Organization", name: "RunAnalytics", url: "https://aitracker.run" },
    mainEntityOfPage: `https://aitracker.run/blog/${post.slug}`,
    citation: post.sources.filter((source) => source.href.startsWith("http")).map((source) => source.href),
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SEO title={post.title} description={post.description} url={`https://aitracker.run/blog/${post.slug}`} type="article" structuredData={articleSchema} />
      <FAQSchema faqs={post.faqs} />
      <PublicHeader />
      <header className="border-b bg-gradient-to-br from-slate-50 to-orange-50 px-4 py-12 text-center dark:from-slate-900 dark:to-slate-950 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-strava-orange">{post.category}</p>
        <h1 className="mx-auto mt-3 max-w-4xl text-3xl font-bold text-charcoal dark:text-white sm:text-5xl">{post.title}</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600 dark:text-slate-300">{post.lede}</p>
        <p className="mt-4 text-sm text-slate-500">{post.dateLabel} · {post.readTime}</p>
      </header>
      <ArticleTrust topic={post.topic} />
      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <nav className="mb-10 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900" aria-label="Table of contents"><h2 className="font-bold">In this guide</h2><ol className="mt-3 grid gap-2 sm:grid-cols-2">{post.sections.map((section) => <li key={section.id}><a className="text-blue-700 hover:underline dark:text-blue-300" href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav>
        <article className="prose prose-slate max-w-none dark:prose-invert prose-a:text-blue-700 dark:prose-a:text-blue-300 prose-table:block prose-table:overflow-x-auto">
          {post.sections.map((section) => <section key={section.id} id={section.id} className="scroll-mt-24"><h2>{section.title}</h2><div dangerouslySetInnerHTML={{ __html: section.html }} /></section>)}
          <section><h2>Frequently asked questions</h2>{post.faqs.map((faq) => <details key={faq.question}><summary><strong>{faq.question}</strong></summary><p>{faq.answer}</p></details>)}</section>
          <section><h2>Sources and related tools</h2><ul>{post.sources.map((source) => <li key={source.href}><a href={source.href} target={source.href.startsWith("http") ? "_blank" : undefined} rel={source.href.startsWith("http") ? "nofollow noopener noreferrer" : undefined}>{source.label}{source.href.startsWith("http") && <ExternalLink className="ml-1 inline h-3 w-3" />}</a></li>)}</ul></section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
