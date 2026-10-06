$(document).ready(function () {
  const $status = $("#search-status");
  const $results = $("#results");

  $.getJSON("openlibrary-search.json")
    .done(function (data) {
      const docs = Array.isArray(data.docs) ? data.docs : [];

      if (docs.length === 0) {
        $status.text("No book records were found in the JSON file.");
        return;
      }

      $results.empty();

      // Required loop: process every book record in the docs array.
      $.each(docs, function (index, book) {
        const title = value(book.title, "Untitled");
        const authors = arrayValue(book.author_name, "Not Available");
        const year = value(book.first_publish_year, "Not Available");
        const publishers = arrayValue(book.publisher, "Not Available");
        const editions = value(book.edition_count, "Not Available");
        const isbn = arrayValue(book.isbn, "Not Available");
        const cover = getCover(book);
        const link = getRecordLink(book);

        let card = `
          <article class="result-card">
            ${cover ? `<img class="result-cover" src="${escapeAttr(cover)}"
              alt="Cover of ${escapeHtml(title)}">` : `
              <div class="result-cover placeholder" aria-label="No cover available">No Cover</div>`}
            <div class="result-content">
              <p class="record-number">Book ${index + 1}</p>
              <h2>${escapeHtml(title)}</h2>
              <p><strong>Author(s):</strong> ${escapeHtml(authors)}</p>
              <p><strong>First Publication Year:</strong> ${escapeHtml(year)}</p>
              <p><strong>Publisher:</strong> ${escapeHtml(publishers)}</p>
              <p><strong>Edition Count:</strong> ${escapeHtml(editions)}</p>
              <p><strong>ISBN:</strong> ${escapeHtml(isbn)}</p>
              ${link ? `<a class="text-link" href="${escapeAttr(link)}"
                target="_blank" rel="noopener">View Open Library Record</a>` : ""}
            </div>
          </article>`;

        $results.append(card);
      });

      $status.text(`${docs.length} book record(s) loaded successfully.`);
    })
    .fail(function () {
      $status
        .removeClass("status")
        .addClass("status error")
        .html(
          "The JSON file could not be loaded. Make sure <strong>openlibrary-search.json</strong> is in the same folder as this webpage."
        );
    });

  function value(v, fallback) {
    return v === undefined || v === null || v === "" ? fallback : v;
  }

  function arrayValue(v, fallback) {
    if (Array.isArray(v) && v.length) return v.join(", ");
    return value(v, fallback);
  }

  function getCover(book) {
    if (book.cover_i) return `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
    if (book.cover && typeof book.cover === "string") return book.cover;
    return "";
  }

  function getRecordLink(book) {
    if (book.url) return book.url;
    if (book.key) return `https://openlibrary.org${book.key}`;
    return "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
});
