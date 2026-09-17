using System.Text;
using System.Text.Json;
using MtgToolsApi.DataRepository;
using MtgToolsApi.DataRepository.Databases;
using MtgToolsApi.Utilities;
using static MtgToolsApi.DataRepository.ScryfallJsonClass;
using static MtgToolsApi.Utilities.ScryfallParser;
using static MtgToolsApi.Utilities.StringConstants;

namespace MtgToolsApi.DataLayer;

public static class TursoCardDb
{
    private static string _dbUrl = DbUrl;
    private static string _dbToken = DbToken;

    public static void Configure(string? dbUrl, string? dbToken)
    {
        if (!string.IsNullOrWhiteSpace(dbUrl)) _dbUrl = dbUrl;
        if (!string.IsNullOrWhiteSpace(dbToken)) _dbToken = dbToken;
    }

    private static readonly Lazy<Db> LazyDb = new(() =>
    {
        var db = new Db(_dbUrl, _dbToken);
        try
        {
            db.ApplyMigrationsAsync().GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error applying initial Turso DB migrations: {ex.Message}");
        }
        return db;
    });

    public static Db DbClient => LazyDb.Value;

    private static readonly HttpClient SharedHttpClient = CreateHttpClient();

    private static HttpClient CreateHttpClient()
    {
        var client = new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(10)
        };
        client.DefaultRequestHeaders.Add("User-Agent", "MTGToolsApp/1.0");
        client.DefaultRequestHeaders.Add("Accept", "*/*");
        return client;
    }

    public static async Task<int?> LogMessage(string message)
    {
        try
        {
            var dbClient = DbClient;
            if (dbClient.Logs != null)
            {
                var escapedMessage = message.Replace("'", "''");
                var command = $"INSERT INTO Logs (logmessage, loggedat) VALUES ('{escapedMessage}', '{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}');";

                var result = await dbClient.Client.QueryAsync(command);
                return result?.Results[0].Response?.Result.AffectedRowCount;
            }

            return null;
        }
        catch (Exception e)
        {
            Console.WriteLine($"Logging to DB failed: {e.Message}");
            return null;
        }
    }

    public static async Task<List<CardRecord>> GetCardsFromDb(List<CardRecord> cardList)
    {
        if (cardList.Count == 0) return cardList;

        await Logging.ApiLogger.LogMessage("Getting cards from DB");
        var escapedNames = cardList.Select(x => $"\"{x.Name.Replace("\"", "\"\"")}\"");
        var cards = string.Join(",", escapedNames);
        var dbClient = DbClient;
        
        var command = string.Format(SqlQueries.SelectCardsFromList, cards);
        var results = await dbClient.Client.QueryAsync(command);

        var resultRows = results?.Results[0].Response?.Result.Rows;
        if (resultRows == null) return cardList.OrderBy(x => x.Name).ToList();

        foreach (var row in resultRows)
        {
            var cardName = row[1].Value?.ToString();
            var printedName = row[2].Value?.ToString();

            // Match by name or printed name
            var card = cardList.FirstOrDefault(x => x.Name == cardName) ??
                       cardList.FirstOrDefault(x => x.Name == printedName);
            if (card == null)
            {
                continue;
            }

            var type = row[3].Value?.ToString();
            var colors = row[4].Value?.ToString();
            var colorIdentity = row[5].Value?.ToString();
            var isGameChanger = Convert.ToBoolean(row[6].Value?.ToString());

            if (!string.IsNullOrEmpty(cardName) && card.Name != cardName)
            {
                card.Name = TextHelpers.SplitCardName(cardName);
            }

            card.Type = TextHelpers.CleanCardType((type ?? string.Empty).Replace("//", "/").Split('/')[0].Trim());
            card.Colors = (colors ?? string.Empty).Replace(",", "");
            card.ColorIdentity = (colorIdentity ?? string.Empty).Split(",");
            card.IsGameChanger = isGameChanger;
        }

        return cardList.OrderBy(x => x.Name).ToList();
    }

    public static async Task PopulateCardDbFromJsonFile(IFormFile file)
    {
        try
        {
            await using var stream = file.OpenReadStream();
            var cardsFromJson = await JsonSerializer.DeserializeAsync<List<Card>>(stream, JsonNamingOptions());
            await PopulateCardDbFromJson(cardsFromJson);
        }
        catch (Exception ex)
        {
            await Logging.ApiLogger.LogMessage(ex.Message);
        }
    }

    private static string BuildBulkCardInsert(List<Card>? cardsFromJson)
    {
        var commandBuilder = new StringBuilder();

        commandBuilder.AppendLine("INSERT INTO cards");
        commandBuilder.AppendLine("(name,printedname,type,colors,coloridentity,isgamechanger)");
        commandBuilder.AppendLine("VALUES");

        var validCardTypes = TextHelpers.GetCtvList();

        foreach (var card in cardsFromJson ?? [])
        {
            var name = card.Name;
            var type = card.TypeLine;
            var colors = card.Colors;
            var printedName = card.PrintedName;

            if (card.CardFacesArray.Length > 0 && card.Layout != "split")
            {
                name = card.CardFacesArray[0].Name;
                printedName = card.CardFacesArray[0].PrintedName;
                type = card.CardFacesArray[0].TypeLine;
                colors = card.CardFacesArray[0].Colors;
            }

            if (!validCardTypes.Any(x => type != null && type.Contains(x.TypeValue)))
            {
                continue;
            }

            commandBuilder.Append('(');
            commandBuilder.Append($"'{(!string.IsNullOrEmpty(name) ? name.Replace("'", "''").Replace(";", "") : string.Empty)}',");
            commandBuilder.Append($"'{(!string.IsNullOrEmpty(printedName) ? printedName.Replace("'", "''").Replace(";", "") : string.Empty)}',");
            commandBuilder.Append($"'{(!string.IsNullOrEmpty(type) ? type.Replace("'", "''") : string.Empty)}',");
            commandBuilder.Append($"'{string.Join(",", colors ?? [])}',");
            commandBuilder.Append($"'{string.Join(",", card.ColorIdentity ?? [])}',");
            commandBuilder.Append($"'{card.IsGameChanger}'");
            commandBuilder.Append("),");
        }

        var commandString = commandBuilder.ToString();
        var lastComma = commandString.LastIndexOf(',');
        if (lastComma < 0) return string.Empty;
        return commandString.Remove(lastComma, 1).Insert(lastComma, ";");
    }

    public static async Task UpdateBulkData()
    {
        await Logging.ApiLogger.LogMessage("Checking for bulk data updates");
        try
        {
            var latestUpdateDate = DateTime.MinValue;
            var dbClient = DbClient;
            if (dbClient.BulkData != null)
            {
                var command = SqlQueries.SelecttUniqueArtworkBulkData;
                var results = await dbClient.Client.QueryAsync(command);
                var resultRows = results?.Results[0].Response?.Result.Rows;
                if (resultRows is { Count: > 0 } && resultRows[0][0].Value != null)
                {
                    if (DateTime.TryParse(resultRows[0][0].Value?.ToString(), out var parsedDate))
                    {
                        latestUpdateDate = parsedDate;
                    }
                    await Logging.ApiLogger.LogMessage($"Date of last update is {latestUpdateDate}");
                }

                var bulkDataJson = await GetBulkDataJson();
                var uniqueArtworkRecord = bulkDataJson?.FirstOrDefault(x => x.Type == "unique_artwork");
                if (uniqueArtworkRecord != null &&
                    DateTime.TryParse(uniqueArtworkRecord.UpdatedAt, out var updatedAt) &&
                    updatedAt > latestUpdateDate)
                {
                    await Logging.ApiLogger.LogMessage($"Date of new update is {uniqueArtworkRecord.UpdatedAt}");
                    await dbClient.BulkData.TruncateTable();
                    var insertBulkSql = BuildBulkDataInsert(bulkDataJson);
                    if (!string.IsNullOrEmpty(insertBulkSql))
                    {
                        await dbClient.Client.QueryAsync(insertBulkSql);
                    }
                    var uniqueArtworkJson = await SelectUniqueArtworkBulkData(uniqueArtworkRecord.DownloadUri);
                    await PopulateCardDbFromJson(uniqueArtworkJson);
                }
            }
        }
        catch (Exception e)
        {
            await Logging.ApiLogger.LogMessage(e.ToString());
        }
    }

    private static async Task<List<BulkData>?> GetBulkDataJson()
    {
        await Logging.ApiLogger.LogMessage("Fetching bulk data metadata from Scryfall");
        try
        {
            using var response = await SharedHttpClient.GetAsync(ScryfallBulkDataUrl);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync();
            var responseList = await JsonSerializer.DeserializeAsync<BulkDataParent>(stream, JsonNamingOptions());
            return responseList?.Data;
        }
        catch (Exception e)
        {
            await Logging.ApiLogger.LogMessage($"Failed to get bulk data: {e}");
            return null;
        }
    }

    private static async Task<List<Card>?> SelectUniqueArtworkBulkData(string downloadUri)
    {
        try
        {
            using var response = await SharedHttpClient.GetAsync(downloadUri);
            response.EnsureSuccessStatusCode();
            
            await using var jsonStream = await response.Content.ReadAsStreamAsync();
            var cardsFromJson = await JsonSerializer.DeserializeAsync<List<Card>>(jsonStream, JsonNamingOptions());
            
            return cardsFromJson;
        }
        catch (Exception e)
        {
            await Logging.ApiLogger.LogMessage($"Failed to download unique artwork cards: {e}");
            return null;
        }
    }

    private static async Task PopulateCardDbFromJson(List<Card>? cardsFromJson)
    {
        try
        {
            if (cardsFromJson == null || cardsFromJson.Count == 0)
            {
                await Logging.ApiLogger.LogMessage("No cards to populate");    
                return;
            }

            var recordsInserted = 0;
            await Logging.ApiLogger.LogMessage($"Populating DB with {cardsFromJson.Count} cards");
            var dbClient = DbClient;
            var uniqueCards = cardsFromJson.DistinctBy(x => new { x.Name, x.PrintedName }).OrderBy(x => x.Name).ToList();
            if (dbClient.Cards == null) return;
            await dbClient.Cards.TruncateTable();

            var chunks = uniqueCards.Chunk(500);
            foreach (var chunk in chunks)
            {
                var bulkInsertCommand = BuildBulkCardInsert(chunk.ToList());
                if (!string.IsNullOrEmpty(bulkInsertCommand))
                {
                    var result = await dbClient.Client.QueryAsync(bulkInsertCommand);
                    recordsInserted += result?.Results[0].Response?.Result.AffectedRowCount ?? 0;
                }
            }
            await Logging.ApiLogger.LogMessage($"{recordsInserted} records successfully inserted");
        }
        catch (Exception ex)
        {
            await Logging.ApiLogger.LogMessage($"Error populating card DB: {ex.Message}");
        }
    }

    private static string BuildBulkDataInsert(List<BulkData>? bulkDataJson)
    {
        var commandBuilder = new StringBuilder();

        commandBuilder.AppendLine("INSERT INTO bulkdata");
        commandBuilder.AppendLine("(scryfallid,type,updatedat,uri,name,description,size,downloaduri)");
        commandBuilder.AppendLine("VALUES");

        foreach (var record in bulkDataJson ?? [])
        {
            commandBuilder.Append('(');
            commandBuilder.Append($"'{record.Id}',");
            commandBuilder.Append($"'{record.Type}',");
            commandBuilder.Append($"'{record.UpdatedAt}',");
            commandBuilder.Append($"'{record.Uri}',");
            commandBuilder.Append($"'{(record.Name ?? string.Empty).Replace("'", "''")}',");
            commandBuilder.Append($"'{(record.Description ?? string.Empty).Replace("'", "''")}',");
            commandBuilder.Append($"'{record.Size}',");
            commandBuilder.Append($"'{record.DownloadUri}'");
            commandBuilder.Append("),");
        }

        var commandString = commandBuilder.ToString();
        var lastComma = commandString.LastIndexOf(',');
        if (lastComma < 0) return string.Empty;
        return commandString.Remove(lastComma, 1).Insert(lastComma, ";");
    }
}
