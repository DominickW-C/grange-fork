defmodule GrangeWeb.ChatChannelTest do
  @moduledoc false
  use GrangeWeb.ChannelCase

  alias Grange.Accounts
  alias Grange.Chat
  alias GrangeWeb.ChannelCase, as: Helper

  setup do
    Accounts.reset()
    :ok
  end

  defp join_town(username) do
    user = Helper.register_user(username)

    socket(GrangeWeb.UserSocket, user.id, %{user: user})
    |> subscribe_and_join(GrangeWeb.ChatChannel, "chat:town")
  end

  test "join requires a signed-in socket" do
    assert {:error, %{error: "not logged in"}} =
             socket(GrangeWeb.UserSocket, nil, %{})
             |> subscribe_and_join(GrangeWeb.ChatChannel, "chat:town")
  end

  test "join rejects unknown rooms" do
    user = Helper.register_user("Chat-Room")

    assert {:error, %{error: "unknown room"}} =
             socket(GrangeWeb.UserSocket, user.id, %{user: user})
             |> subscribe_and_join(GrangeWeb.ChatChannel, "chat:casino")
  end

  test "a line is broadcast with the session author and a timestamp" do
    {:ok, reply, socket} = join_town("Chat-Alice")
    assert reply.room == "town"

    ref = push(socket, "chat", %{"text" => "  hello   town  "})
    assert_reply(ref, :ok)

    assert_broadcast("chat", %{author: "Chat-Alice", text: "hello town", at: at})
    assert is_integer(at)
  end

  test "empty messages are rejected" do
    {:ok, _reply, socket} = join_town("Chat-Empty")

    ref = push(socket, "chat", %{"text" => "   "})
    assert_reply(ref, :error, %{error: "message is empty"})
  end

  test "overlong messages are rejected" do
    {:ok, _reply, socket} = join_town("Chat-Long")

    ref = push(socket, "chat", %{"text" => String.duplicate("a", Chat.max_length() + 1)})
    assert_reply(ref, :error, %{error: "message is too long"})
  end

  test "malformed payloads are rejected" do
    {:ok, _reply, socket} = join_town("Chat-Bad")

    assert_reply(push(socket, "chat", %{"text" => 42}), :error, %{error: "invalid message"})
    assert_reply(push(socket, "chat", %{}), :error, %{error: "invalid message"})
  end

  test "a burst is throttled" do
    {:ok, _reply, socket} = join_town("Chat-Burst")

    refs =
      for _ <- 1..5 do
        push(socket, "chat", %{"text" => "spam"})
      end

    Enum.each(refs, &assert_reply(&1, :ok))

    ref = push(socket, "chat", %{"text" => "spam"})
    assert_reply(ref, :error, %{error: "slow down"})
  end

  test "joining does not replay earlier messages" do
    {:ok, _reply, alice} = join_town("Chat-History-Alice")
    push(alice, "chat", %{"text" => "before you arrived"})
    assert_broadcast("chat", %{text: "before you arrived"})
    # The test process also gets the channel's own push copy; drain it.
    assert_push("chat", %{text: "before you arrived"})

    {:ok, _reply, _bob} = join_town("Chat-History-Bob")
    refute_push("chat", _, 100)
  end
end
