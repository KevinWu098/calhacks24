import { Person } from "@/app/(layout)/dashboard/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Route, User } from "lucide-react";

interface DetectedPersonsProps {
    persons: Person[];
    handlePersonClick: (person: Person) => void;
    selectedPersons: Person[];
    handlePersonSelection: (person: Person, multiSelect: boolean) => void;
    planRescueRoute: () => void;
    selectMode: boolean;
    toggleSelectMode: () => void;
}

export function DetectedPersons({
    persons,
    handlePersonClick,
    selectedPersons,
    handlePersonSelection,
    planRescueRoute,
    selectMode,
    toggleSelectMode,
}: DetectedPersonsProps) {
    return (
        <div className="flex h-full flex-col p-4">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center text-xl font-bold">
                    <User
                        className="mr-2"
                        size={24}
                    />
                    Detected Persons
                </h2>
                <Checkbox
                    checked={selectMode}
                    onCheckedChange={toggleSelectMode}
                    aria-label="Toggle select mode"
                />
            </div>
            <div className="grid flex-grow grid-cols-2 gap-4 overflow-auto">
                {persons.map((person, index) => (
                    <div
                        key={person.id}
                        className={`cursor-pointer overflow-hidden rounded-lg bg-gray-100 shadow-sm ${
                            selectedPersons.some((p) => p.id === person.id)
                                ? "ring-2 ring-blue-500"
                                : ""
                        }`}
                        onClick={(e) =>
                            selectMode
                                ? handlePersonSelection(
                                      person,
                                      e.ctrlKey || e.metaKey
                                  )
                                : handlePersonClick(person)
                        }
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
            {selectedPersons.length > 0 && (
                <Button
                    className="mt-4 w-full bg-blue-500 text-white hover:bg-blue-600"
                    onClick={planRescueRoute}
                >
                    <Route
                        className="mr-2"
                        size={18}
                    />
                    Plan rescue route
                </Button>
            )}
        </div>
    );
}
