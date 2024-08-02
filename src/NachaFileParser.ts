
export class NachaFieldSpec {
    // startPos and endPos are 1-based, following the positions given here:
    // https://achdevguide.nacha.org/ach-file-details
    startPos: number;
    endPos: number;
    numeric: boolean = false;

    constructor(startPos: number, endPos: number, numeric?: boolean) {
        this.startPos = startPos;
        this.endPos = endPos;
        if (typeof(numeric) !== 'undefined') { this.numeric = numeric; }
    }

    public getRaw(text: string): string {
        return text.substring(this.startPos-1, this.endPos);
    }

    public getInt(text: string): number {
        let raw = this.getRaw(text);
        return parseInt(raw, 10);
    }

    public getStr(text: string): string {
        let raw = this.getRaw(text);
        return raw.trim();
    }
}

export class NachaRecord {
    FIELDS: { [name: string]: NachaFieldSpec } = {};
    rawText: string;
    lineNumber: number;

    constructor(rawText: string, lineNumber: number) {
        this.rawText = rawText;
        this.lineNumber = lineNumber;
    }

    public getInt(name: string): number {
        let spec = this.FIELDS[name];
        return spec.getInt(this.rawText);
    }

    public getStr(name: string): string {
        let spec = this.FIELDS[name];
        return spec.getStr(this.rawText);
    }

    public getRaw(name: string): string {
        let spec = this.FIELDS[name];
        return spec.getRaw(this.rawText);
    }
}

export class FileHeaderRecord extends NachaRecord {
    FIELDS = {
        priority_code: new NachaFieldSpec(2,3, true),
        immediate_destination: new NachaFieldSpec(4, 13),
        immediate_origin: new NachaFieldSpec(14, 23),
        file_creation_date: new NachaFieldSpec(24, 29),
        file_creation_time: new NachaFieldSpec(30, 33)
    };

    control?: FileControlRecord;
}

export class FileControlRecord extends NachaRecord {
    FIELDS = {
    };

    header?: FileHeaderRecord;
}

export class BatchHeaderRecord extends NachaRecord {
    FIELDS = {
    };

    control?: BatchControlRecord;
    entries: Array<EntryDetailRecord> = [];
}

export class BatchControlRecord extends NachaRecord {
    FIELDS = {
    };

    header?: BatchHeaderRecord;
}

export class EntryDetailRecord extends NachaRecord {
    FIELDS = {
    };

    batchHeader?: BatchHeaderRecord;
    addendum?: EntryAddendumRecord;
}

export class EntryAddendumRecord extends NachaRecord {
    FIELDS = {
    };

    entry?: EntryDetailRecord;
}

export class PaddingRecord extends NachaRecord {
}

export class NachaFileError {
    message: string;
    line?: string;
    lineNumber?: number;
    record?: NachaRecord;

    constructor(message: string, options?: { line?: string, lineNumber?: number, record?: NachaRecord }) {
        this.message = message;
        this.line = options?.line;
        this.lineNumber = options?.lineNumber;
        this.record = options?.record;
    }
}

export class NachaFileParser {
    rawText: string;
    lines: Array<string>;
    records: Array<NachaRecord> = []

    fileHeader?: FileHeaderRecord;
    batchHeaders: Array<BatchHeaderRecord> = [];
    entries: Array<EntryDetailRecord> = [];

    errors: Array<NachaFileError> = [];

    constructor(rawText: string) {
        this.rawText = rawText;

        let normalized = this.rawText.replace(/\r\n/g, '\n').trim();
        this.lines = normalized.split('\n');

        this.lines.forEach((line: string, lineNumber: number) => this.records.push(this.buildRecord(line, lineNumber+1)));
        this.validate();
    }

    static RECORD_TYPE_MAP: { [id: string]: typeof NachaRecord } = {
        "1": FileHeaderRecord,
        "5": BatchHeaderRecord,
        "6": EntryDetailRecord,
        "7": EntryAddendumRecord,
        "8": BatchControlRecord,
        "9": FileControlRecord,
    }

    buildRecord(line: string, lineNumber: number): NachaRecord {
        // special case for padding:
        if (line.startsWith("999")) {
            return new PaddingRecord(line, lineNumber);
        }

        let recordType = line.substring(0, 1);
        let recordClass = NachaFileParser.RECORD_TYPE_MAP[recordType];
        if (recordClass === undefined) {
            let record = new NachaRecord(line, lineNumber);
            this.addError(`unrecognized record type "${recordType}"`, record=record);
            return record;
        }

        return new recordClass(line, lineNumber);
    }

    addError(message: string, options?: {
        line?: string, lineNumber?: number, record?: NachaRecord
    }): void {
        let error = new NachaFileError(
            message, {
                line: options?.line ? options.line : options?.record ? options.record.rawText : undefined,
                lineNumber: options?.lineNumber ? options.lineNumber : options?.record ? options.record.lineNumber : undefined,
                record: options?.record
            });
        this.errors.push(error);
    }

    validate(): void {
        let currentBatch: BatchHeaderRecord | null = null;
        let currentEntry: EntryDetailRecord | null = null;

        for (let record of this.records) {
            if (record instanceof FileHeaderRecord) {
                if (this.fileHeader === undefined) {
                    this.fileHeader = record;
                } else {
                    this.addError("found more than one file header record", record=record);
                }
            }
            else if (record instanceof FileControlRecord) {
                if (this.fileHeader === undefined) {
                    this.addError("file control not preceeded by file header", record=record);
                } else {
                    if (this.fileHeader.control === undefined) {
                        this.fileHeader.control = record;
                        record.header = this.fileHeader;
                    }  else {
                        this.addError("found more than one file control record", record=record);
                    }
                } 
            }
            
            else if (record instanceof BatchHeaderRecord) {
                this.batchHeaders.push(record);
                
                if (this.fileHeader === undefined) {
                    this.addError("batch header not preceeded by file header", record=record);
                }
                if (currentBatch === null) {
                    // @ts-ignore -- not sure why this is needed? but it doesn't like assiging record because it is inferred
                    // as "NachaRecord | BatchHeaderRecord", which can't be assigned to "BatchHeaderRecord | null"
                    currentBatch = record; 
                } else {
                    this.addError("starting a new batch before end of previous batch", record=record);
                }
            }
            else if (record instanceof BatchControlRecord) {
                if (currentBatch === null) {
                    this.addError("batch control not preceeded by batch header", record=record);
                } else {
                    currentBatch.control = record;
                    record.header = currentBatch;
                    currentBatch = null;
                    currentEntry = null;
                }
            }

            else if (record instanceof EntryDetailRecord) {
                if (currentBatch === null) {
                    this.addError("entry detail not preceeded by batch header", record=record);
                } else {
                    this.entries.push(record);
                    currentBatch.entries.push(record);
                    currentEntry = record;
                    record.batchHeader = currentBatch;
                }
            }
            else if (record instanceof EntryAddendumRecord) {
                if (currentEntry === null) {
                    this.addError("entry detail not preceeded by batch header", record=record);
                } else {
                    if (currentEntry.addendum !== undefined) {
                        this.addError("more than one addendum for entry", record=record);
                    }
                    currentEntry.addendum = record;
                }
            }
        }
    }
}
