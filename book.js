$(document).ready(function () {
  const $status = $("#book-status");
  const $output = $("#book-output");

  $.getJSON("openlibrary-book.json")
    .done(function (data) {
      const book = data;

      const title = firstValue(book.title, book.name, "Untitled");
      const publishers = listValue(book.publishers, book.publisher);
      const publicationDate = firstValue(
        book.publish_date,
        book.publication_date,
        book.first_publish_date,
        "Not Available"
      );
      const pages = firstValue(
        book.number_of_pages,
        book.number_of_pages_median,
        "Not Available"
      );
      const isbn10 = firstValue(
        book.isbn_10,
        book.isbn10,
        nestedISBN(book, "isbn_10"),
        "Not Available"
      );
      const isbn13 = firstValue(
        book.isbn_13,
        book.isbn13,
        nestedISBN(book, "isbn_13"),
        "Not Available"
      );
      const authors = getAuthors(book);
      const firstSentence = getFirstSentence(book);
      const cover = getCover(book);
      const recordLink = getRecordLink(book);

      let html = '<div class="book-layout">';

      if (cover) {
        html += `
          <div class="cover-wrap">
            <img src="${escapeAttr(cover)}" alt="Cover of ${escapeHtml(title)}">
          </div>`;
      }

      html += `
        <div class="book-info">
          <h2>${escapeHtml(title)}</h2>
          ${row("Author(s)", authors)}
          ${row("Publisher", publishers)}
          ${row("Publication Date", publicationDate)}
          ${row("Page Count", pages)}
          ${row("ISBN-10", isbn10)}
          ${row("ISBN-13", isbn13)}
          ${row("First Sentence", firstSentence)}
          ${recordLink ? `<p><strong>Open Library Record:</strong>
            <a href="${escapeAttr(recordLink)}" target="_blank" rel="noopener">View record</a></p>` : ""}
        </div>
      </div>`;

      $output.html(html);
      $status.text("Book information loaded successfully.");
    })
    .fail(function () {
      $status
        .removeClass("status")
        .addClass("status error")
        .html(
          "The JSON file could not be loaded. Make sure <strong>openlibrary-book.json</strong> is in the same folder as this webpage."
        );
    });

  function row(label, value) {
    return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(display(value))}</p>`;
  }

  function display(value) {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "Not Available";
    return value === undefined || value === null || value === "" ? "Not Available" : String(value);
  }

  function firstValue() {
    for (let i = 0; i < arguments.length; i++) {
      const value = arguments[i];
      if (Array.isArray(value) && value.length) return value;
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "Not Available";
  }

  function listValue() {
    const value = firstValue.apply(null, arguments);
    return Array.isArray(value) ? value : value;
  }

  function nestedISBN(obj, key) {
    if (Array.isArray(obj[key])) return obj[key];
    if (obj.identifiers && Array.isArray(obj.identifiers[key])) return obj.identifiers[key];
    return "";
  }

  function getAuthors(book) {
    if (Array.isArray(book.authors)) {
      return book.authors.map(a => typeof a === "string" ? a : (a.name || a.author?.name || a.key || "Unknown")).join(", ");
    }
    if (Array.isArray(book.author_name)) return book.author_name.join(", ");
    return book.author || "Not Available";
  }

  function getFirstSentence(book) {
    if (typeof book.first_sentence === "string") return book.first_sentence;
    if (book.first_sentence && typeof book.first_sentence === "object") {
      return book.first_sentence.value || "Not Available";
    }
    return "Not Available";
  }

  function getCover(book) {
    if (book.cover && typeof book.cover === "string") return book.cover;
    if (book.cover && book.cover.medium) return book.cover.medium;
    if (book.cover && book.cover.large) return book.cover.large;
    if (book.cover_i) return `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
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
