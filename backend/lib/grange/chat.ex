defmodule Grange.Chat do
  @moduledoc """
  Normalizes and throttles room-scoped player chat.

  Chat is ephemeral: a line is broadcast to the room's topic and never stored,
  so there is no history to replay on join. The server always owns the author
  (from the socket session) and the timestamp; the client only supplies text.

  Both chat surfaces (`chat:town` and `farm:<owner>`) share these limits.
  """

  @max_length 200
  @burst_limit 5
  @burst_window_ms 3_000

  @doc """
  Collapses client text into a single trimmed line.

  Runs of whitespace become one space, control characters are dropped, and the
  result must be 1..200 characters. Errors are short lowercase strings so the
  SPA can drop them straight into the notification feed.
  """
  @spec normalize(term()) :: {:ok, String.t()} | {:error, String.t()}
  def normalize(text) when is_binary(text) do
    cleaned =
      text
      |> String.replace(~r/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u, "")
      |> String.replace(~r/\s+/u, " ")
      |> String.trim()

    cond do
      cleaned == "" -> {:error, "message is empty"}
      String.length(cleaned) > @max_length -> {:error, "message is too long"}
      true -> {:ok, cleaned}
    end
  end

  def normalize(_text), do: {:error, "invalid message"}

  @doc """
  Records one send at `now` (monotonic milliseconds) and reports whether the
  sender is over the short burst limit.

  Returns the retained timestamps so channels can store them back in a socket
  assign; old entries fall out of the window automatically.
  """
  @spec throttle([integer()], integer()) :: {:ok, [integer()]} | {:error, :slow_down}
  def throttle(sent_at, now) when is_list(sent_at) and is_integer(now) do
    recent = Enum.filter(sent_at, &(now - &1 < @burst_window_ms))

    if length(recent) >= @burst_limit do
      {:error, :slow_down}
    else
      {:ok, recent ++ [now]}
    end
  end

  @doc "The maximum accepted message length, in characters."
  @spec max_length() :: pos_integer()
  def max_length, do: @max_length

  @doc "The wire payload both chat rooms broadcast."
  @spec line_payload(String.t(), String.t()) :: map()
  def line_payload(username, text) do
    %{author: username, text: text, at: System.system_time(:millisecond)}
  end
end
