import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { useAnalysisStore } from "~/lib/store";
import { Link } from "react-router";
import { useMemo } from "react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Resumide" },
        { name: "description", content: "Smart feedback for your dream job!" },
    ];
}

export default function Home() {
    const entryMap = useAnalysisStore((s) => s.entries);
    const entries = useMemo(() => Object.values(entryMap), [entryMap]);

    return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar />

        <section className="main-section">
            <div className="page-heading py-16">
                <h1>Track Your Applications & Resume Ratings</h1>
                {entries.length === 0 ? (
                    <h2>No resumes found. Upload your first resume to get feedback.</h2>
                ) : (
                    <h2>Review your submissions and check AI-powered feedback.</h2>
                )}
            </div>

            {entries.length > 0 && (
                <div className="resumes-section">
                    {entries.map((entry) => (
                        <ResumeCard
                            key={entry.id}
                            resume={{
                                id: entry.id,
                                jobTitle: entry.jobTitle,
                                imagePath: "",
                                resumePath: "",
                                feedback: entry.result.feedback,
                            }}
                            pdf={entry.pdf}
                        />
                    ))}
                </div>
            )}

            {entries.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-10 gap-4">
                    <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
                        Upload Resume
                    </Link>
                </div>
            )}
        </section>
    </main>;
}
