import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { useAnalysisStore } from "~/lib/store";
import { convertPdfToImage } from "~/lib/pdf2img";
import Summary from "~/components/Summary";
import Details from "~/components/Details";
import ATS from "~/components/ATS";
import ParseView from "~/components/ParseView";
import Heatmap from "~/components/Heatmap";

export const meta = () => ([
    { title: "Resumide | Review" },
    { name: "description", content: "Detailed overview of your resume" },
]);

const Resume = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const entry = useAnalysisStore((s) => (id ? s.entries[id] : undefined));
    const [imageUrl, setImageUrl] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    // No auth yet (single-user demo). If the entry isn't in the in-memory store
    // (e.g. page refresh), send the user home rather than render a blank page.
    useEffect(() => {
        if (!entry) {
            const t = setTimeout(() => navigate("/"), 0);
            return () => clearTimeout(t);
        }
    }, [entry, navigate]);

    // Render the thumbnail + open-in-new-tab link from the stored PDF Blob.
    // Fixes the original memory leak: revoke object URLs on cleanup.
    useEffect(() => {
        if (!entry) return;
        let revokeImg: string | null = null;
        let revokePdf: string | null = null;

        setFeedback(entry.result.feedback);
        const pdfUrl = URL.createObjectURL(entry.pdf);
        revokePdf = pdfUrl;
        setResumeUrl(pdfUrl);

        let cancelled = false;
        convertPdfToImage(entry.pdf).then((res) => {
            if (cancelled) {
                if (res.imageUrl) URL.revokeObjectURL(res.imageUrl);
                return;
            }
            if (res.imageUrl) {
                revokeImg = res.imageUrl;
                setImageUrl(res.imageUrl);
            }
        });

        return () => {
            cancelled = true;
            if (revokeImg) URL.revokeObjectURL(revokeImg);
            if (revokePdf) URL.revokeObjectURL(revokePdf);
        };
    }, [entry]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">
                        Back to Homepage
                    </span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg) bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback && entry ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                            <ParseView parseView={entry.result.parseView} imageUrl={imageUrl} />
                            <Heatmap
                                jdKeywords={entry.result.jdKeywords}
                                matchedKeywords={entry.result.matchedKeywords}
                                missingKeywords={entry.result.missingKeywords}
                                ruleTrace={entry.result.ruleTrace}
                            />
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    );
};
export default Resume;