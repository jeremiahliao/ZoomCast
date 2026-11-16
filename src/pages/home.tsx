import { Button } from "../components/Button";
import { PageLayout } from "../components/PageLayout";

const mockTableEntries = [
    { title: "Recording 1" , date: "01/01/2021", size: "10MB"  }
];

export function Home() {
    const handleNewUpload = () => {
        //TODO
        console.log("New Upload");
        
    }


    return (
        <PageLayout>
            {/* Home page content goes here */}
            <div className="flex justify-between items-center p-4 bg-[var(--color-surface)] border-1 rounded-md border-[var(--color-border)]">
                <h2 className="text-[var(--color-text)] font-semibold">
                    Recent Uploads
                </h2>
                <Button
                    onClick={handleNewUpload}
                >
                    + New Upload
                </Button>
            </div>
            {/* Table for recent uploads */}

        </PageLayout>
    )
}
