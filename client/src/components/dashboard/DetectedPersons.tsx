import { Person } from "@/app/(layout)/dashboard/page";
import { User } from "lucide-react";

interface DetectedPersonsProps {
    persons: Person[];
    handlePersonClick: (person: Person) => void;
}

export function DetectedPersons({
    persons,
    handlePersonClick,
}: DetectedPersonsProps) {
    return (
        <div className="p-4">
            <h2 className="mb-4 flex items-center text-xl font-bold">
                <User
                    className="mr-2"
                    size={24}
                />
                Detected Persons
            </h2>
            <div className="grid grid-cols-2 gap-4">
                {persons.map((person, index) => (
                    <div
                        key={index}
                        className="cursor-pointer overflow-hidden rounded-lg bg-gray-100 shadow-sm"
                        onClick={() => handlePersonClick(person)}
                    >
                        <img
                            src={`data:image/jpeg;base64,${person.image}`}
                            alt={`Person ${index + 1}`}
                            className="aspect-square w-full object-cover"
                        />
                        <div className="p-2">
                            <p className="text-sm text-gray-600">
                                {person.timestamp}
                            </p>
                            <p className="text-sm font-bold text-blue-600">
                                {Math.round(person.confidence * 100)}%
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
