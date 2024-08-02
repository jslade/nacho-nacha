import { BatchControlRecord, BatchHeaderRecord, EntryAddendumRecord, EntryDetailRecord, FileControlRecord, FileHeaderRecord, NachaRecord, PaddingRecord } from "./NachaFileParser";

class NachaRecordRenderer<Type extends NachaRecord> {
    async render(record: Type): Promise<string> {
        return `<li class="record"><span class="lineNumber">${record.lineNumber}:</span>&nbsp<span class="text">${this.renderFields(record)}</span>`;
    }

    renderFields(record: Type): string {
        // To be subclassed
        return record.rawText;
    }    

    renderFieldsByName(record: Type, names: Array<string>): string {
        const colors = ["c0", "c1", "c2", "c3", "c4", "c5"];
        let rendered = "";

        names.forEach((name: string, i: number) => {
            rendered += this.renderField(record, name, colors[i % colors.length]);
        });
        
        rendered += "\n";
        return rendered;
    }

    renderField(record: Type, name: string, color_class: string): string {
        let spec = record.FIELDS[name];
        if (spec === undefined) {
            console.error(`No field defined for ${typeof record}: ${name}`);
            return "";
        }

        let content = record.getRaw(name);
        let value = spec.numeric ? record.getInt(name) : record.getStr(name);

        return `<span class="${color_class}" title="${name}: ${value}">${content}</span>`;
    }
}

class FileHeaderRecordRenderer extends NachaRecordRenderer<FileHeaderRecord> {
    renderFields(record: FileHeaderRecord) {
        return this.renderFieldsByName(record, Object.keys(record.FIELDS));
    }
}

class FileControlRecordRenderer extends NachaRecordRenderer<FileControlRecord> {
    renderFields(record: FileControlRecord) {
        return this.renderFieldsByName(record, Object.keys(record.FIELDS));
    }
}

class BatchHeaderRecordRenderer extends NachaRecordRenderer<BatchHeaderRecord> {
    renderFields(record: BatchHeaderRecord) {
        return this.renderFieldsByName(record, Object.keys(record.FIELDS));
    }
}

class BatchControlRecordRenderer extends NachaRecordRenderer<BatchControlRecord> {
    renderFields(record: BatchControlRecord) {
        return this.renderFieldsByName(record, Object.keys(record.FIELDS));
    }
}

class EntryDetailRecordRenderer extends NachaRecordRenderer<EntryDetailRecord> {
    renderFields(record: EntryDetailRecord) {
        return this.renderFieldsByName(record, Object.keys(record.FIELDS));
    }
}

class EntryAddendumRecordRenderer extends NachaRecordRenderer<EntryAddendumRecord> {
    renderFields(record: EntryAddendumRecord) {
        return this.renderFieldsByName(record, Object.keys(record.FIELDS));
    }
}

class PaddingRecordRenderer extends NachaRecordRenderer<PaddingRecord> {

}

class UnknownRecordRenderer extends NachaRecordRenderer<NachaRecord> {

}





export const RECORD_RENDERERS: { [id: string]: NachaRecordRenderer<NachaRecord> } = {
    "1": new FileHeaderRecordRenderer(),
    "5": new BatchHeaderRecordRenderer(),
    "6": new EntryDetailRecordRenderer(),
    "7": new EntryAddendumRecordRenderer(),
    "8": new BatchControlRecordRenderer(),
    "9": new FileControlRecordRenderer(),
    "999": new PaddingRecordRenderer(),
    "?": new UnknownRecordRenderer(),
};

