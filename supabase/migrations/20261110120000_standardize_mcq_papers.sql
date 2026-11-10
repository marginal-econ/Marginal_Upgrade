-- Standardize Cambridge 9708 MCQ Paper Metadata & Titles
-- Fixes miscategorized exam years (e.g. 2024 & 2023 papers previously assigned to 2026)
-- and updates non-standard filenames to the official Cambridge nomenclature:
-- '9708 <Series> <Year> Paper <Code>'

UPDATE public.mcq_pdf_papers
SET
  title = '9708 Oct/Nov 2024 Paper 13',
  exam_year = 2024,
  exam_series = 'Oct/Nov',
  level = 'as'
WHERE id = '52b389a1-7625-450f-96f1-dfcead5637ea';

UPDATE public.mcq_pdf_papers
SET
  title = '9708 Feb/March 2023 Paper 12',
  exam_year = 2023,
  exam_series = 'Feb/March',
  level = 'as'
WHERE id = '54ba59ac-3ac7-44f3-bfc3-c9a6f85eb9f9';

UPDATE public.mcq_pdf_papers
SET
  title = '9708 May/June 2025 Paper 13',
  exam_year = 2025,
  exam_series = 'May/June',
  level = 'as'
WHERE id = 'e387faf6-9dfa-46cc-9941-13caa55e272e';

UPDATE public.mcq_pdf_papers
SET
  title = '9708 Feb/March 2025 Paper 12',
  exam_year = 2025,
  exam_series = 'Feb/March',
  level = 'as'
WHERE id = '1aaed0ae-398b-4b73-9911-b81e593328e1';

UPDATE public.mcq_pdf_papers
SET
  title = '9708 Oct/Nov 2022 Paper 11',
  exam_year = 2022,
  exam_series = 'Oct/Nov',
  level = 'as'
WHERE id = '293efe82-d127-4dbc-a6bc-60dde7db1bb2';

UPDATE public.mcq_pdf_papers
SET
  title = '9708 Oct/Nov 2023 Paper 11',
  exam_year = 2023,
  exam_series = 'Oct/Nov',
  level = 'as'
WHERE id = 'f38bd072-5497-4b28-8c7c-90984567c5a2';

UPDATE public.mcq_pdf_papers
SET
  title = '9708 Oct/Nov 2023 Paper 13',
  exam_year = 2023,
  exam_series = 'Oct/Nov',
  level = 'as'
WHERE id = '683b070f-7d4d-4023-afd5-4c7a2bcb9388';

-- Update past student attempt titles to match standardized paper titles
UPDATE public.mcq_pdf_attempts a
SET title = p.title, level = p.level
FROM public.mcq_pdf_papers p
WHERE a.paper_id = p.id
  AND (a.title != p.title OR a.level != p.level);
