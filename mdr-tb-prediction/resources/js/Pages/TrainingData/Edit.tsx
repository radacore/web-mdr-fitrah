import { TrainingDataForm, TrainingDataRecord } from './Partials/TrainingDataForm';

export default function Edit({ trainingData }: { trainingData: TrainingDataRecord }) {
    return <TrainingDataForm record={trainingData} />;
}
