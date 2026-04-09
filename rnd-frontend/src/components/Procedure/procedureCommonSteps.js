export const PROCEDURE_COMMON_TAIL_STEPS = [
    'Transfer the mass to the storage vessel. Inform to QC dept. with the sample, advice slip to draw the sample for analysis.',
    'Move product to filling line. Fill product into appropriate containers, seal containers/Jars to prevent leakage. Apply labels to containers/jars, place labeled containers/jars into cartons. Do the quality check of packed cartons. Store or ship packed cartons to warehouse or distribution centers.'
];

export const appendCommonProcedureTailSections = (sections) => {
    const baseSections = Array.isArray(sections) ? sections : [];

    const tailSections = PROCEDURE_COMMON_TAIL_STEPS.map((description, index) => ({
        id: `fixed-common-${index + 1}`,
        stepNo: baseSections.length + index + 1,
        descriptionOfProcess: description,
        rows: [],
        isFixedCommonTail: true
    }));

    return [...baseSections, ...tailSections];
};
