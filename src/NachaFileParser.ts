
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
    type: string;
    lineNumber: number;

    constructor(rawText: string, lineNumber: number) {
        this.rawText = rawText;
        this.type = rawText.substring(0, 1);
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
        record_type: new NachaFieldSpec(1, 1, true),
        priority_code: new NachaFieldSpec(2, 3, true),
        immediate_destination: new NachaFieldSpec(4, 13),
        immediate_origin: new NachaFieldSpec(14, 23),
        file_creation_date: new NachaFieldSpec(24, 29),
        file_creation_time: new NachaFieldSpec(30, 33),
        file_id_modifier: new NachaFieldSpec(34, 34),
        record_size: new NachaFieldSpec(35, 37, true),
        blocking_factor: new NachaFieldSpec(38, 39, true),
        format_code: new NachaFieldSpec(40, 40, false),
        immediate_destination_name: new NachaFieldSpec(41, 63),
        immediate_origin_name: new NachaFieldSpec(64, 86),
        reference_code: new NachaFieldSpec(87, 94)
    };

    control?: FileControlRecord;
}

export class FileControlRecord extends NachaRecord {
    FIELDS = {
        record_type: new NachaFieldSpec(1, 1, true),
        batch_count: new NachaFieldSpec(2, 7, true),
        block_count: new NachaFieldSpec(8, 13, true),
        entry_addenda_count: new NachaFieldSpec(14, 21, true),
        entry_hash: new NachaFieldSpec(22, 31),
        total_debit_amount_cents: new NachaFieldSpec(32, 43, true),
        total_credit_amount_cents: new NachaFieldSpec(44, 55, true),
        reserved: new NachaFieldSpec(56, 94),
    };

    header?: FileHeaderRecord;
}

export class BatchHeaderRecord extends NachaRecord {
    FIELDS = {
        record_type: new NachaFieldSpec(1, 1, true),
        service_class_code: new NachaFieldSpec(2, 4),
        company_name: new NachaFieldSpec(5, 20),
        company_discretionary_data: new NachaFieldSpec(21, 40),
        company_id: new NachaFieldSpec(41, 50),
        sec_code: new NachaFieldSpec(51, 53),
        description: new NachaFieldSpec(54, 63),
        descriptive_date: new NachaFieldSpec(64, 69),
        effective_date: new NachaFieldSpec(70, 75),
        settlement_date: new NachaFieldSpec(76, 78, true),
        originator_status_code: new NachaFieldSpec(79, 79),
        orignator_dfi_id: new NachaFieldSpec(80, 87),
        batch_number: new NachaFieldSpec(88, 94, true),
    };

    control?: BatchControlRecord;
    entries: Array<EntryDetailRecord> = [];
}

export class BatchControlRecord extends NachaRecord {
    FIELDS = {
        record_type: new NachaFieldSpec(1, 1, true),
        service_class_code: new NachaFieldSpec(2, 4),
        entry_addenda_count: new NachaFieldSpec(5, 10, true),
        entry_hash: new NachaFieldSpec(11, 20),
        total_debit_amount_cents: new NachaFieldSpec(21, 32, true),
        total_credit_amount_cents: new NachaFieldSpec(33, 44, true),
        company_id: new NachaFieldSpec(45, 54),
        message_authentication_code: new NachaFieldSpec(55, 73, true),
        reserved: new NachaFieldSpec(74, 79),
        orignator_dfi_id: new NachaFieldSpec(80, 87),
        batch_number: new NachaFieldSpec(88, 94, true),
    };

    header?: BatchHeaderRecord;
}

export class EntryDetailRecord extends NachaRecord {
    FIELDS = {
        record_type: new NachaFieldSpec(1, 1, true),
        transaction_code: new NachaFieldSpec(2, 3, true),
        receiving_dfi_id: new NachaFieldSpec(4, 11),
        check_digit: new NachaFieldSpec(12, 12, true),
        account_number: new NachaFieldSpec(13, 29),
        amount: new NachaFieldSpec(30, 39, true),
        identification_number: new NachaFieldSpec(40, 54),
        receiver_name: new NachaFieldSpec(55, 76),
        discretionary_data: new NachaFieldSpec(77, 78),
        addenda_record_indicator: new NachaFieldSpec(79, 79, true),
        trace_number: new NachaFieldSpec(80, 94, true),
    };

    batchHeader?: BatchHeaderRecord;
    addendum?: EntryAddendumRecord;
}

export class EntryAddendumRecord extends NachaRecord {
    FIELDS = {
        record_type: new NachaFieldSpec(1, 1, true),
        type_code: new NachaFieldSpec(2, 3, true),
        payment_information: new NachaFieldSpec(4, 83),
        addenda_sequence_number: new NachaFieldSpec(84, 87, true),
        entry_sequence_number: new NachaFieldSpec(88, 94, true),
    };

    entry?: EntryDetailRecord;
}

export class PaddingRecord extends NachaRecord {
    constructor(rawText: string, lineNumber: number) {
        super(rawText, lineNumber);
        this.type = "999";
    }
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
    records: Array<NachaRecord> = [];

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
    };

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
        this.validateRecordOrdering();
    }

    validateRecordOrdering(): void {
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
                    // @ts-ignore
                    currentEntry.addendum = record;
                }
            }
        }
    }
}
