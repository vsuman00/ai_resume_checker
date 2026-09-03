import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import { useEffect, useState } from "react";
import { convertPdfToImage } from "~/lib/pdf2img";

// imagePath/resumePath are kept on the Resume type for compatibility but are
// no longer used — the thumbnail now renders from the optional `pdf` Blob.
const ResumeCard = ({
    resume: { id, companyName, jobTitle, feedback },
    pdf,
}: {
    resume: Resume;
    pdf?: Blob;
}) => {
    const [resumeUrl, setResumeUrl] = useState("");

    useEffect(() => {
        if (!pdf) return;
        let revoked: string | null = null;
        let cancelled = false;
        convertPdfToImage(pdf).then((res) => {
            if (cancelled) {
                if (res.imageUrl) URL.revokeObjectURL(res.imageUrl);
                return;
            }
            if (res.imageUrl) {
                revoked = res.imageUrl;
                setResumeUrl(res.imageUrl);
            }
        });
        return () => {
            cancelled = true;
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [pdf]);

    return (
        <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                    {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                </div>
                <div className="flex-shrink-0">
                    <ScoreCircle score={feedback.overallScore} />
                </div>
            </div>
            {resumeUrl && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="w-full h-full">
                        <img
                            src={resumeUrl}
                            alt="resume"
                            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                        />
                    </div>
                </div>
            )}
        </Link>
    );
};
export default ResumeCard;