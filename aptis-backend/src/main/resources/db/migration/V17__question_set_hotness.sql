ALTER TABLE question_sets
    ADD COLUMN hotness TINYINT NULL AFTER difficulty,
    ADD CONSTRAINT chk_question_sets_hotness CHECK (hotness IS NULL OR hotness BETWEEN 1 AND 5);

CREATE INDEX idx_question_sets_hotness ON question_sets (part_id, status, hotness);
