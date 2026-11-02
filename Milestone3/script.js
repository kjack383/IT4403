/* Milestone 3 - BookFinder
   All Open Library requests use jQuery AJAX as required by the assignment. */

$(document).ready(function () {
    const SEARCH_URL = "https://openlibrary.org/search.json";
    const SUBJECT_URL = "https://openlibrary.org/subjects/science_fiction.json";
    const RESULTS_PER_PAGE = 10;
    const MAX_RESULTS = 50;

    let searchResults = [];
    let currentPage = 1;
    let currentSearchTerm = "";
    let isSearching = false;
    let detailsCache = {};

    // Start the independent subject collection when the page loads.
    loadCollection();

    $("#search-form").on("submit", function (event) {
        event.preventDefault();
        searchBooks();
    });

    $("#previous-page").on("click", function () {
        if (currentPage > 1) {
            currentPage--;
            renderSearchResults();
        }
    });

    $("#next-page").on("click", function () {
        const totalPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderSearchResults();
        }
    });

    function searchBooks() {
        const term = $("#search-input").val().trim();

        if (!term) {
            showMessage("#search-message", "Please enter a title or keyword before searching.", "error");
            $("#search-input").trigger("focus");
            return;
        }

        if (isSearching) return;

        isSearching = true;
        currentSearchTerm = term;
        currentPage = 1;
        searchResults = [];

        $("#search-button").prop("disabled", true).text("Searching...");
        $("#results-grid").html('<p class="empty-state">Searching Open Library...</p>');
        $("#results-count").text("");
        $("#pagination").prop("hidden", true);
        $("#details-content").text("Select a book from the results to see its details.");
        showMessage("#search-message", "Loading search results...", "");

        $.ajax({
            url: SEARCH_URL,
            method: "GET",
            dataType: "json",
            data: {
                q: term,
                limit: MAX_RESULTS,
                fields: "key,title,author_name,cover_i"
            },
            success: function (data) {
                searchResults = Array.isArray(data.docs) ? data.docs.slice(0, MAX_RESULTS) : [];

                if (searchResults.length === 0) {
                    $("#results-grid").html('<p class="empty-state">No books matched "' + escapeHtml(term) + '". Try another title or keyword.</p>');
                    $("#results-count").text("0 books");
                    showMessage("#search-message", "Search completed. No matching books were found.", "");
                    return;
                }

                showMessage("#search-message", "Search completed successfully.", "success");
                renderSearchResults();
            },
            error: function () {
                $("#results-grid").html('<p class="empty-state">We could not retrieve search results. Please check your connection and try again.</p>');
                showMessage("#search-message", "The Open Library search request failed. Please try again.", "error");
            },
            complete: function () {
                isSearching = false;
                $("#search-button").prop("disabled", false).text("Search books");
            }
        });
    }

    function renderSearchResults() {
        const totalPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE);
        const start = (currentPage - 1) * RESULTS_PER_PAGE;
        const visibleBooks = searchResults.slice(start, start + RESULTS_PER_PAGE);

        $("#results-grid").empty();
        visibleBooks.forEach(function (book) {
            $("#results-grid").append(createBookCard(book));
        });

        $("#results-count").text(searchResults.length + (searchResults.length === 1 ? " book found" : " books found"));
        $("#pagination").prop("hidden", totalPages <= 1);
        $("#page-indicator").text("Page " + currentPage + " of " + totalPages);
        $("#previous-page").prop("disabled", currentPage === 1);
        $("#next-page").prop("disabled", currentPage === totalPages);
    }

    function loadCollection() {
        $("#collection-message").text("Loading the Science Fiction collection...").removeClass("error success");

        $.ajax({
            url: SUBJECT_URL,
            method: "GET",
            dataType: "json",
            data: { limit: 10, details: "true" },
            success: function (data) {
                const works = Array.isArray(data.works) ? data.works.slice(0, 10) : [];
                $("#collection-grid").empty();

                if (works.length === 0) {
                    $("#collection-grid").html('<p class="empty-state">No books are currently available in this collection.</p>');
                    $("#collection-message").text("The collection is currently empty.");
                    return;
                }

                works.forEach(function (work) {
                    // Subject records use cover_id and key; normalize them to the card format.
                    const book = {
                        key: work.key,
                        title: work.title,
                        author_name: Array.isArray(work.authors) ? work.authors.map(function (a) { return a.name; }) : [],
                        cover_i: work.cover_id
                    };
                    $("#collection-grid").append(createBookCard(book));
                });

                $("#collection-message").text("Showing " + works.length + " books. Select any book to view its details.").addClass("success");
            },
            error: function () {
                $("#collection-grid").html('<p class="empty-state">The collection could not be loaded. Please refresh the page to try again.</p>');
                $("#collection-message").text("Unable to load the Science Fiction collection.").addClass("error");
            }
        });
    }

    function createBookCard(book) {
        const title = book.title || "Title unavailable";
        const authors = Array.isArray(book.author_name) ? book.author_name : [];
        const authorText = authors.length ? authors.join(", ") : "Author information unavailable";
        const coverMarkup = book.cover_i
            ? '<img src="https://covers.openlibrary.org/b/id/' + encodeURIComponent(book.cover_i) + '-M.jpg" alt="Cover of ' + escapeHtml(title) + '" onerror="this.parentElement.innerHTML=\'<span class=&quot;book-cover-fallback&quot;>Cover unavailable</span>\'">'
            : '<span class="book-cover-fallback">Cover unavailable</span>';

        const $card = $('<article class="book-card"></article>');
        const $button = $('<button type="button" class="book-select"></button>');
        $button.append('<div class="book-cover">' + coverMarkup + '</div>');
        $button.append('<div class="book-title">' + escapeHtml(title) + '</div>');
        $button.append('<div class="book-author">' + escapeHtml(authorText) + '</div>');

        $button.on("click", function () {
            selectBook(book);
        });

        $card.append($button);
        return $card;
    }

    function selectBook(book) {
        const workKey = book.key || "";
        const workId = workKey.split("/").pop();

        if (!workId || !/^OL\d+W$/.test(workId)) {
            $("#details-content").html('<p class="details-placeholder">The Work ID for this book is unavailable, so its details cannot be requested.</p>');
            return;
        }

        $("#details-content").html('<p class="details-placeholder">Loading book details...</p>');

        if (detailsCache[workId]) {
            renderBookDetails(detailsCache[workId], book, workId);
            return;
        }

        $.ajax({
            url: "https://openlibrary.org/works/" + encodeURIComponent(workId) + ".json",
            method: "GET",
            dataType: "json",
            success: function (work) {
                detailsCache[workId] = work;
                renderBookDetails(work, book, workId);
            },
            error: function () {
                $("#details-content").html('<p class="details-placeholder">We could not load the book details. Please select it again or try another book.</p>');
            }
        });
    }

    function renderBookDetails(work, searchBook, workId) {
        const title = work.title || searchBook.title || "Title unavailable";
        const description = getDescription(work.description);
        const subjects = Array.isArray(work.subjects) ? work.subjects.slice(0, 10) : [];
        const searchAuthors = Array.isArray(searchBook.author_name) ? searchBook.author_name : [];
        const authorNames = searchAuthors.length ? searchAuthors : [];
        const coverId = (Array.isArray(work.covers) && work.covers.find(function (id) { return id > 0; })) || searchBook.cover_i;
        const coverMarkup = coverId
            ? '<img class="details-cover" src="https://covers.openlibrary.org/b/id/' + encodeURIComponent(coverId) + '-L.jpg" alt="Cover of ' + escapeHtml(title) + '" onerror="this.outerHTML=\'<div class=&quot;details-placeholder&quot;>Cover unavailable</div>\'">'
            : '<div class="details-placeholder">Cover unavailable</div>';

        const $layout = $('<div class="details-layout"></div>');
        $layout.append('<div>' + coverMarkup + '</div>');

        const $copy = $('<div class="details-copy"></div>');
        $copy.append('<h3>' + escapeHtml(title) + '</h3>');
        $copy.append('<p><span class="details-label">Work ID:</span> ' + escapeHtml(workId) + '</p>');
        $copy.append('<p><span class="details-label">Author(s):</span> ' + escapeHtml(authorNames.length ? authorNames.join(", ") : "Author information unavailable") + '</p>');
        $copy.append('<p><span class="details-label">Description:</span> ' + escapeHtml(description || "Description unavailable.") + '</p>');

        if (subjects.length) {
            $copy.append('<p class="details-label">Subjects (up to 10):</p>');
            const $subjectList = $('<div class="subject-list"></div>');
            subjects.forEach(function (subject) {
                $subjectList.append('<span class="subject-tag">' + escapeHtml(subject) + '</span>');
            });
            $copy.append($subjectList);
        } else {
            $copy.append('<p><span class="details-label">Subjects:</span> Subject information unavailable.</p>');
        }

        $copy.append('<a class="open-library-link" href="https://openlibrary.org/works/' + encodeURIComponent(workId) + '" target="_blank" rel="noopener noreferrer">View this book on Open Library ↗</a>');
        $layout.append($copy);
        $("#details-content").empty().append($layout);
    }

    function getDescription(description) {
        if (typeof description === "string") return description;
        if (description && typeof description.value === "string") return description.value;
        return "";
    }

    function showMessage(selector, message, type) {
        $(selector).text(message).removeClass("error success");
        if (type) $(selector).addClass(type);
    }

    // Escape API-provided text before inserting it into HTML.
    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character];
        });
    }
});
