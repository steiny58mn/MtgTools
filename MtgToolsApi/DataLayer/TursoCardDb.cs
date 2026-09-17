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
    private static Db DbClient()
    {
        var db = new Db(DbUrl, DbToken);
        db.ApplyMigrationsAsync();
        return db;
    }

    public static async Task<int?> LogMessage(string message)
    {
        try
        {
            var dbClient = DbClient();
            if (dbClient.Logs != null)
            {
                var commandBuilder = new StringBuilder();

                commandBuilder.AppendLine($"INSERT INTO Logs");
                commandBuilder.AppendLine("(");
                commandBuilder.AppendLine("logmessage,loggedat");
                commandBuilder.AppendLine(")");
                commandBuilder.AppendLine("VALUES");

                commandBuilder.Append('(');
                commandBuilder.Append($"'{message}',");
                commandBuilder.Append($"'{DateTime.Now}'");
                commandBuilder.Append(')');

                var result = await dbClient.Client.QueryAsync(commandBuilder.ToString());
                return result?.Results[0].Response?.Result.AffectedRowCount;
            }

            return null;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return null;
        }
    }

    public static async Task<List<CardRecord>> GetCardsFromDb(List<CardRecord> cardList)
    {
        await Logging.ApiLogger.LogMessage("Getting cards from DB");
        //System.Diagnostics.Trace.TraceInformation("Test trace getting cards");
        var cards = string.Join(",", cardList.Select(x => $"\"{x.Name}\"").ToList());
        var dbClient = DbClient();
        
        var command = string.Format(SqlQueries.SelectCardsFromList, cards);
        var results = await dbClient.Client.QueryAsync(command);

        var resultRows = results?.Results[0].Response?.Result.Rows;
        if (resultRows == null) return cardList.OrderBy(x => x.Name).ToList();

        foreach (var row in resultRows)
        {
            //If we can't find a record by name, try it by printedname
            var card = cardList.FirstOrDefault(x => x.Name == row[1].Value?.ToString()) ??
                       cardList.FirstOrDefault(x => x.Name == row[2].Value?.ToString());
            if (card == null)
            {
                //If we still can't find it, just continue
                continue;
            }

            var cardName = row[1].Value?.ToString();
            //var printedName = row[2].Value?.ToString();
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

    public static async void PopulateCardDbFromJsonFile(IFormFile file)
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

        commandBuilder.AppendLine($"INSERT INTO cards");
        commandBuilder.AppendLine("(");
        commandBuilder.AppendLine("name,printedname,type,colors,coloridentity,isgamechanger");
        commandBuilder.AppendLine(")");
        commandBuilder.AppendLine("VALUES");

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

            if (!TextHelpers.GetCtvList().Any(x => type.Contains(x.TypeValue)))
            {
                continue;
            }

            commandBuilder.Append('(');
            //Clean things up for inserting into SQL
            commandBuilder.Append(
                $"'{(!string.IsNullOrEmpty(name) ? name.Replace("'", "''").Replace(";", "") : string.Empty)}',");
            commandBuilder.Append(
                $"'{(!string.IsNullOrEmpty(printedName) ? printedName.Replace("'", "''").Replace(";", "") : string.Empty)}',");
            commandBuilder.Append($"'{(!string.IsNullOrEmpty(type) ? type.Replace("'", "''") : string.Empty)}',");
            commandBuilder.Append($"'{string.Join(",", colors)}',");
            commandBuilder.Append($"'{string.Join(",", card.ColorIdentity)}',");
            commandBuilder.Append($"'{card.IsGameChanger}'");
            commandBuilder.Append("),");
        }

        var commandString = commandBuilder.ToString();
        var lastComma = commandString.LastIndexOf(',');
        return commandString.Remove(lastComma, 1).Insert(lastComma, ";");
    }

    public static async Task UpdateBulkData()
    {
        await Logging.ApiLogger.LogMessage("Getting bulk data");
        //System.Diagnostics.Trace.TraceInformation("Test trace updating");
        try
        {
            var latestUpdateDate = DateTime.MinValue;
            var dbClient = DbClient();
            if (dbClient.BulkData != null)
            {
                var command = string.Format(SqlQueries.SelecttUniqueArtworkBulkData);
                var results = dbClient.Client.QueryAsync(command).Result;
                var resultRows = results?.Results[0].Response?.Result.Rows;
                if (resultRows is { Count: > 0 })
                {
                    latestUpdateDate = Convert.ToDateTime(resultRows[0][0].Value?.ToString());
                    await Logging.ApiLogger.LogMessage($"Date of Last update is {latestUpdateDate}");
                }

                var bulkDataJson = await GetBulkDataJson();
                var uniqueArtworkRecord = bulkDataJson?.Where(x => x.Type == "unique_artwork").FirstOrDefault();
                if (uniqueArtworkRecord != null &&
                    Convert.ToDateTime(uniqueArtworkRecord.UpdatedAt) > latestUpdateDate)
                {
                    await Logging.ApiLogger.LogMessage($"Date of update is {uniqueArtworkRecord.UpdatedAt}");
                    await dbClient.BulkData.TruncateTable();
                    await dbClient.Client.QueryAsync(BuildBulkDataInsert(bulkDataJson));
                    var uniqueArtworkJson = await SelectUniqueArtworkBulkData(uniqueArtworkRecord.DownloadUri);
                    await PopulateCardDbFromJson(uniqueArtworkJson);
                }
            }
        }
        catch (Exception e)
        {
            await Logging.ApiLogger.LogMessage(e.ToString());
            throw;
        }
    }

    private static async Task<List<BulkData>?> GetBulkDataJson()
    {
        await Logging.ApiLogger.LogMessage("Get bulk data");
        //System.Diagnostics.Trace.TraceInformation("Test trace bulk data");
        try
        {
            var client = GetHttpClient("https://api.scryfall.com/bulk-data");
            using HttpResponseMessage response = client.GetAsync(client.BaseAddress).Result;
            response.EnsureSuccessStatusCode();
            string responseBody = response.Content.ReadAsStringAsync().Result;
            BulkDataParent? responseList = JsonSerializer.Deserialize<BulkDataParent>(responseBody, JsonNamingOptions());
            return responseList?.Data;
        }
        catch (Exception e)
        {
            await Logging.ApiLogger.LogMessage(e.ToString());
            throw;
        }
    }

    private static async Task<List<Card>?> SelectUniqueArtworkBulkData(string downloadUri)
    {
        try
        {
            var client = GetHttpClient(downloadUri);
            using HttpResponseMessage response = client.GetAsync(client.BaseAddress).Result;
            response.EnsureSuccessStatusCode();
            
            var jsonStream = await response.Content.ReadAsStreamAsync();
            var cardsFromJson = await JsonSerializer.DeserializeAsync<List<Card>>(jsonStream, JsonNamingOptions());
            
            return cardsFromJson;
        }
        catch (Exception e)
        {
            await Logging.ApiLogger.LogMessage(e.ToString());
            throw;
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
            await Logging.ApiLogger.LogMessage("Populating DB with cards");
            var dbClient = DbClient();
            var uniqueCards = cardsFromJson.DistinctBy(x => new { x.Name, x.PrintedName }).OrderBy(x => x.Name);
            if (dbClient.Cards == null) return;
            await dbClient.Cards.TruncateTable();

            var chunks = uniqueCards.Chunk(500);
            foreach (var chunk in chunks)
            {
                var bulkInsertCommand = BuildBulkCardInsert(chunk.ToList());

                var result = await dbClient.Client.QueryAsync(bulkInsertCommand);
                recordsInserted += result?.Results[0].Response?.Result.AffectedRowCount ?? 0;
            }
            await Logging.ApiLogger.LogMessage($"{recordsInserted} records inserted");
        }
        catch (Exception ex)
        {
            await Logging.ApiLogger.LogMessage(ex.Message);
            throw;
        }
    }

    private static string BuildBulkDataInsert(List<BulkData>? bulkDataJson)
    {
        var commandBuilder = new StringBuilder();

        commandBuilder.AppendLine($"INSERT INTO bulkdata");
        commandBuilder.AppendLine("(");
        commandBuilder.AppendLine("scryfallid,type,updatedat,uri,name,description,size,downloaduri");
        commandBuilder.AppendLine(")");
        commandBuilder.AppendLine("VALUES");

        foreach (var record in bulkDataJson ?? [])
        {
            commandBuilder.Append('(');
            commandBuilder.Append($"'{record.Id}',");
            commandBuilder.Append($"'{record.Type}',");
            commandBuilder.Append($"'{record.UpdatedAt}',");
            commandBuilder.Append($"'{record.Uri}',");
            commandBuilder.Append($"'{record.Name}',");
            commandBuilder.Append($"'{record.Description}',");
            commandBuilder.Append($"'{record.Size}',");
            commandBuilder.Append($"'{record.DownloadUri}'");
            commandBuilder.Append("),");
        }

        var commandString = commandBuilder.ToString();
        var lastComma = commandString.LastIndexOf(',');
        return commandString.Remove(lastComma, 1).Insert(lastComma, ";");
    }

    private static HttpClient GetHttpClient(string url)
    {
        try
        {
            HttpClient client = new()
            {
                Timeout = Timeout.InfiniteTimeSpan
            };
        
            client.BaseAddress =  new Uri(url);
            client.DefaultRequestHeaders.Add("User-Agent", "MTGToolsApp");
            client.DefaultRequestHeaders.Add("Accept", "*/*");
            return client;
        }
        catch (Exception e)
        {
            _ = Logging.ApiLogger.LogMessage(e.ToString());
            throw;
        }
    }
}